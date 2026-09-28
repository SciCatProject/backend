import { HttpService } from "@nestjs/axios";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom, catchError, of } from "rxjs";
import { handleAxiosRequestError } from "src/common/utils";
import { Logbook } from "./schemas/logbook.schema";
import { Message } from "./schemas/message.schema";
import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";

@Injectable()
export class LogbooksService {
  private logbookEnabled;
  private baseUrl;
  private localMongoClient: MongoClient;
  private localMongoConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.logbookEnabled = this.configService.get<boolean>("logbook.enabled");
    this.baseUrl = this.configService.get<string>("logbook.baseUrl");
  }

  private async localMessages(name: string): Promise<Message[]> {
    const uri = this.configService.get<string>("mongodbUri");
    if (!uri) return [];
    this.localMongoClient ??= new MongoClient(uri);
    if (!this.localMongoConnected) {
      await this.localMongoClient.connect();
      this.localMongoConnected = true;
    }
    const dbName = new URL(uri).pathname.replace(/^\//, "");
    return this.localMongoClient
      .db(dbName)
      .collection("LocalLogbookMessage")
      .find({ room: name })
      .sort({ origin_server_ts: 1 })
      .toArray() as unknown as Promise<Message[]>;
  }

  private async saveLocalMessage(
    name: string,
    message: string,
    metadataPrefix?: string,
    senderName = "SciCat user",
    datasetPid?: string,
  ): Promise<string> {
    const uri = this.configService.get<string>("mongodbUri");
    if (!uri) {
      throw new InternalServerErrorException("MongoDB is not configured");
    }
    this.localMongoClient ??= new MongoClient(uri);
    if (!this.localMongoConnected) {
      await this.localMongoClient.connect();
      this.localMongoConnected = true;
    }
    const dbName = new URL(uri).pathname.replace(/^\//, "");
    const eventId = randomUUID();
    await this.localMongoClient.db(dbName).collection("LocalLogbookMessage").insertOne({
      room: name,
      event_id: eventId,
      origin_server_ts: Date.now(),
      sender: "@scicat-user:local",
      senderName,
      datasetPid,
      content: { msgtype: "m.text", body: message, metadataPrefix, datasetPid },
    });
    return eventId;
  }

  private filterMessages(messages: Message[], filters: string): Message[] {
    const {
      showBotMessages = true,
      showImages = true,
      showUserMessages = true,
      textSearch = "",
    } = JSON.parse(filters);
    const query = textSearch.trim().toLowerCase();

    return messages.filter((message) => {
      const senderName = (message as Message & { senderName?: string }).senderName;
      const isImage = message.content?.msgtype === "m.image";
      const isBot = message.sender?.includes("bot") ||
        senderName?.toLowerCase().includes("control");
      const isUserMessage = !isBot && !isImage;
      const matchesText = !query ||
        message.content?.body?.toLowerCase().includes(query) ||
        senderName?.toLowerCase().includes(query);

      return (
        matchesText &&
        (showImages || !isImage) &&
        (showBotMessages || !isBot) &&
        (showUserMessages || !isUserMessage)
      );
    });
  }

  async findAll(): Promise<Logbook[] | null> {
    if (this.logbookEnabled) {
      try {
        Logger.log("Fetching Logbooks", "LogbooksService.findAll");
        const res = await firstValueFrom(
          this.httpService.get<Logbook[]>(this.baseUrl + "/Logbooks"),
        );

        const nonEmptyLogbooks = res.data.filter(
          (logbook) => logbook.messages.length !== 0,
        );
        const emptyLogbooks = res.data.filter(
          (logbook) => logbook.messages.length === 0,
        );
        nonEmptyLogbooks
          .sort(
            (a, b) =>
              a.messages[a.messages.length - 1].origin_server_ts -
              b.messages[b.messages.length - 1].origin_server_ts,
          )
          .reverse();
        const logbooks = nonEmptyLogbooks.concat(emptyLogbooks);
        Logger.log("Found logbooks", "LogbooksService.findAll");
        return logbooks;
      } catch (error) {
        handleAxiosRequestError(error, "LogbooksService.findAll");
        throw new InternalServerErrorException("Fetching Logbooks failed");
      }
    }
    return [];
  }

  async findByName(name: string, filters: string): Promise<Logbook | null> {
    if (this.logbookEnabled) {
      try {
        Logger.log(
          "Fetching logbook with proposal id: " + name,
          "LogbooksService.findByName",
        );
        Logger.log(filters, "LogbooksService.findByName");
        const res = await firstValueFrom(
          this.httpService
            .get<Logbook>(this.baseUrl + `/Logbooks/${name}?filter=${filters}`)
            .pipe(
              catchError((_error) => {
                return of({ data: null });
              }),
            ),
        );

        const local = await this.localMessages(name);
        if (!res.data && local.length === 0) {
          Logger.log("Logbook not found", { name });
          return null;
        }

        Logger.log("Found logbook " + name, "LogbooksService.findByName");
        const logbook: Logbook = {
          name: res.data?.name || name,
          roomId: res.data?.roomId || name,
          messages: [...(res.data?.messages || []), ...local],
        };
        const { skip, limit, sortField } = JSON.parse(filters);
        logbook.messages = this.filterMessages(logbook.messages, filters);
        Logger.log(
          "Applying filters skip: " +
            skip +
            ", limit: " +
            limit +
            ", sortField: " +
            sortField,
          "LogbooksService.findByName",
        );
        if (!!sortField && sortField.indexOf(":") > 0) {
          logbook.messages = sortMessages(logbook.messages, sortField);
        }
        if (skip >= 0 && limit >= 0) {
          const end = skip + limit;
          const messages = logbook.messages.slice(skip, end);
          return { ...logbook, messages };
        }
        return logbook;
      } catch (error) {
        handleAxiosRequestError(error, "LogbooksService.findByName");
      }
    }
    return null;
  }

  async sendMessage(
    name: string,
    data: {
      message: string;
      metadataPrefix?: string;
      senderName?: string;
      datasetPid?: string;
    },
  ): Promise<{ event_id: string } | null> {
    if (this.logbookEnabled) {
      try {
        Logger.log(
          "Sending message to room " + name,
          "LogbooksService.sendMessage",
        );
        const eventId = await this.saveLocalMessage(
          name,
          data.message,
          data.metadataPrefix,
          data.senderName || "SciCat user",
          data.datasetPid,
        );
        Logger.log(
          "Message with eventId " + eventId + " saved to room " + name,
          "LogbooksService.sendMessage",
        );
        return { event_id: eventId };
      } catch (error) {
        handleAxiosRequestError(error, "LogbooksService.sendMessage");
      }
    } else {
      throw new InternalServerErrorException(
        "Logbook username and/or password not configured",
      );
    }
    return null;
  }
}

const sortMessages = (messages: Message[], sortField: string): Message[] => {
  const [column, direction] = sortField.split(":");
  let sorted = messages.sort((a, b) => {
    switch (column) {
      case "timestamp": {
        return a.origin_server_ts - b.origin_server_ts;
      }
      case "sender": {
        if (a.sender.replace("@", "") < b.sender.replace("@", "")) {
          return -1;
        }
        if (a.sender.replace("@", "") > b.sender.replace("@", "")) {
          return 1;
        }
        return 0;
      }
      case "entry": {
        if (a.content.body < b.content.body) {
          return -1;
        }
        if (a.content.body > b.content.body) {
          return 1;
        }
        return 0;
      }
      default: {
        return 0;
      }
    }
  });
  if (direction === "desc") {
    sorted = sorted.reverse();
  }
  return sorted;
};
