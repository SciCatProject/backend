import { MailerService } from "@nestjs-modules/mailer";
import { MailService } from "./mail.service";

describe("MailService", () => {
  let mailerService: MailerService;
  let mailService: MailService;

  beforeEach(() => {
    mailerService = { sendMail: jest.fn() } as unknown as MailerService;
    mailService = new MailService(mailerService);
  });

  it("forwards the underlying mailer's result when it succeeds", async () => {
    const sentMessageInfo = {
      messageId: "abc123",
      accepted: ["a@example.com"],
    };
    (mailerService.sendMail as jest.Mock).mockResolvedValue(sentMessageInfo);

    await expect(
      mailService.sendMail({ to: "a@example.com", subject: "s", html: "b" }),
    ).resolves.toBe(sentMessageInfo);
  });

  it("rethrows when the underlying mailer fails", async () => {
    (mailerService.sendMail as jest.Mock).mockRejectedValue(
      new Error("SMTP connection refused"),
    );

    await expect(
      mailService.sendMail({ to: "a@example.com", subject: "s", html: "b" }),
    ).rejects.toThrow("SMTP connection refused");
  });
});
