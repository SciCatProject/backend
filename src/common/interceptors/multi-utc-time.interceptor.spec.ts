import { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { MeasurementPeriodClass } from "src/proposals/schemas/measurement-period.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { MultiUTCTimeInterceptor } from "./multi-utc-time.interceptor";

const createContext = (body: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ body }),
    }),
  }) as ExecutionContext;

const callHandler: CallHandler = { handle: () => of(null) };

describe("MultiUTCTimeInterceptor", () => {
  const interceptor = new MultiUTCTimeInterceptor<
    ProposalClass,
    MeasurementPeriodClass
  >("MeasurementPeriodList", ["start", "end"]);

  it("should convert the dates of every measurement period to UTC", () => {
    const body: Record<string, unknown> = {
      MeasurementPeriodList: [
        {
          instrument: "ESS3-1",
          start: "2017-07-24T13:56:30+02:00",
          end: "2017-07-25T13:56:30+02:00",
          comment: "Some comment",
        },
      ],
    };
    const context = createContext(body);

    void interceptor.intercept(context, callHandler);

    const measurementPeriodList =
      body.MeasurementPeriodList as MeasurementPeriodClass[];
    expect(measurementPeriodList).toHaveLength(1);
    expect(new Date(measurementPeriodList[0].start).toISOString()).toBe(
      "2017-07-24T11:56:30.000Z",
    );
    expect(new Date(measurementPeriodList[0].end).toISOString()).toBe(
      "2017-07-25T11:56:30.000Z",
    );
    expect(measurementPeriodList[0].instrument).toBe("ESS3-1");
    expect(measurementPeriodList[0].comment).toBe("Some comment");
  });

  it("should not add the measurement period list to a body that does not contain it", () => {
    const body: Record<string, unknown> = { title: "A test proposal" };
    const context = createContext(body);

    void interceptor.intercept(context, callHandler);

    expect(body).not.toHaveProperty("MeasurementPeriodList");
  });
});
