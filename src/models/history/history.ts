import { IGenerator } from "../../generator";
import { TopicNormal } from "../topic";
import { User } from "../user";
import Copyable from "ts-copyable";
import * as Im from "immutable";

export interface IHistoryDB {
  readonly id: string;
  readonly body: {
    readonly topic: string,
    readonly title: string,
    readonly tags: string[],
    readonly body: string,
    readonly date: string,
    readonly hash: string,
    readonly user: string,
  };
}

export interface IHistoryAPI {
  readonly id: string;
  readonly topic: string;
  readonly title: string;
  readonly tags: string[];
  readonly body: string;
  readonly date: string;
  readonly hash: string;
}

export class History extends Copyable<History>{
  static fromDB(h: IHistoryDB): History {
    return new History(h.id,
      h.body.topic,
      h.body.title,
      Im.List(h.body.tags),
      h.body.body,
      new Date(h.body.date),
      h.body.hash,
      h.body.user);
  }

  static create(objidGenerator: IGenerator<string>, topic: TopicNormal, date: Date, hash: string, user: User): History {
    return new History(objidGenerator.get(), topic.id, topic.title, Im.List(topic.tags), topic.body, date, hash, user.id);
  }

  constructor(public readonly id: string,
    public readonly topic: string,
    public readonly title: string,
    public readonly tags: Im.List<string>,
    public readonly body: string,
    public readonly date: Date,
    public readonly hash: string,
    public readonly user: string) {
    super(History);
  }

  toDB(): IHistoryDB {
    return {
      id: this.id,
      body: {
        topic: this.topic,
        title: this.title,
        tags: this.tags.toArray(),
        body: this.body,
        date: this.date.toISOString(),
        hash: this.hash,
        user: this.user,
      },
    };
  }

  toAPI(): IHistoryAPI {
    return {
      id: this.id,
      topic: this.topic,
      title: this.title,
      tags: this.tags.toArray(),
      body: this.body,
      date: this.date.toISOString(),
      hash: this.hash,
    };
  }
}
