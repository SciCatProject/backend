import { ConfigService } from "@nestjs/config";
import { MessageEvent } from "@nestjs/common";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { SseService } from "./sse.service";

const makeUser = (id: string): JWTUser => ({
  _id: id,
  username: `user-${id}`,
  email: `${id}@example.com`,
  currentGroups: [],
});

describe("SseService", () => {
  let service: SseService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new SseService({
      get: () => undefined,
    } as unknown as ConfigService);
    service.enable();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it("sends a heartbeat to open streams every 20 seconds", () => {
    const received: MessageEvent[] = [];
    service.getEvents(makeUser("a")).subscribe((m) => received.push(m));

    jest.advanceTimersByTime(20_000);
    jest.advanceTimersByTime(20_000);

    expect(received).toEqual([
      { type: "heartbeat", data: "" },
      { type: "heartbeat", data: "" },
    ]);
  });

  it("stops tracking a stream once it is unsubscribed", () => {
    const subscription = service.getEvents(makeUser("a")).subscribe();
    expect(service.getAllConnections().connections).toBe(1);

    subscription.unsubscribe();

    expect(service.getAllConnections().connections).toBe(0);
  });

  it("closes the oldest connection instead of rejecting at the limit", () => {
    const user = makeUser("a");
    const completed: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      service.getEvents(user).subscribe({
        complete: () => (completed[i] = true),
      });
    }
    expect(service.getAllConnections().connections).toBe(5);

    let sixthCompleted = false;
    service.getEvents(user).subscribe({
      complete: () => (sixthCompleted = true),
    });

    expect(completed[0]).toBe(true);
    expect(completed.slice(1).some(Boolean)).toBe(false);
    expect(sixthCompleted).toBe(false);
    expect(service.getAllConnections().connections).toBe(5);
  });

  it("does not close other users' connections when evicting", () => {
    const other = makeUser("b");
    let otherCompleted = false;
    service.getEvents(other).subscribe({
      complete: () => (otherCompleted = true),
    });

    const user = makeUser("a");
    for (let i = 0; i < 6; i++) {
      service.getEvents(user).subscribe();
    }

    expect(otherCompleted).toBe(false);
    expect(service.getAllConnections().users).toEqual({
      "user-a": 5,
      "user-b": 1,
    });
  });

  it("stops the heartbeat timer on destroy", () => {
    expect(jest.getTimerCount()).toBe(1);

    service.onModuleDestroy();

    expect(jest.getTimerCount()).toBe(0);
  });
});
