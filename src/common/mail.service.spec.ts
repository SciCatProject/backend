import { MailerService } from "@nestjs-modules/mailer";
import { MailService } from "./mail.service";

describe("MailService", () => {
  let mailerService: MailerService;
  let mailService: MailService;

  beforeEach(() => {
    mailerService = { sendMail: jest.fn() } as unknown as MailerService;
    mailService = new MailService(mailerService);
  });

  it("resolves when the underlying mailer succeeds", async () => {
    (mailerService.sendMail as jest.Mock).mockResolvedValue(undefined);

    await expect(
      mailService.sendMail({ to: "a@example.com", subject: "s", html: "b" }),
    ).resolves.toBeUndefined();
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
