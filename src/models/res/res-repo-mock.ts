import { Subject } from "rxjs";
import { AtNotFoundError, AtNotFoundPartError } from "../../at-error";
import { IAuthToken } from "../../auth";
import { Config } from "../../config";
import { Topic } from "../topic";
import { IResRepo } from "./ires-repo";
import { fromDBToRes, IResDB, Res } from "./res";

export class ResRepoMock implements IResRepo {
  readonly insertEvent: Subject<{ res: Res, count: number }> = new Subject<{ res: Res, count: number }>();
  private reses: IResDB[] = [];

  async findOne(id: string): Promise<Res> {
    const res = this.reses.find(x => x.id === id);

    if (res === undefined) {
      throw new AtNotFoundError("レスが存在しません");
    }

    return (await this.aggregate([res]))[0];
  }

  async findIn(ids: string[]): Promise<Res[]> {
    const reses = this.reses
      .filter(x => ids.includes(x.id))
      .sort((a, b) => new Date(a.body.date).valueOf() - new Date(b.body.date).valueOf());

    if (reses.length !== ids.length) {
      throw new AtNotFoundPartError("レスが存在しません",
        reses.map(r => r.id));
    }

    return this.aggregate(reses);
  }

  async find(topic: Topic, type: "before" | "after", equal: boolean, date: Date, limit: number): Promise<Res[]> {
    const reses = this.reses
      .filter(x => x.body.topic === topic.id)
      .filter(x => {
        const dateV = date.valueOf();
        const xDateV = new Date(x.body.date).valueOf();
        return type === "after"
          ? (equal ? dateV <= xDateV : dateV < xDateV)
          : (equal ? xDateV <= dateV : xDateV < dateV);
      })
      .sort((a, b) => {
        const av = new Date(a.body.date).valueOf();
        const bv = new Date(b.body.date).valueOf();
        return type === "after" ? bv - av : av - bv;
      })
      .slice(0, limit);

    const result = await this.aggregate(reses);
    if (type === "after") {
      result.reverse();
    }
    return result;
  }

  async findNew(topic: Topic, limit: number): Promise<Res[]> {
    const reses = this.reses
      .filter(x => x.body.topic === topic.id)
      .sort((a, b) => new Date(a.body.date).valueOf() - new Date(b.body.date).valueOf())
      .slice(0, limit);

    return await this.aggregate(reses);
  }

  async findNotice(
    authToken: IAuthToken,
    type: "before" | "after",
    equal: boolean,
    date: Date,
    limit: number): Promise<Res[]> {
    const reses = this.reses
      .filter(x => x.type === "normal" && x.body.reply !== null && x.body.reply.user === authToken.user)
      .filter(x => {
        const dateV = date.valueOf();
        const xDateV = new Date(x.body.date).valueOf();
        return type === "after"
          ? (equal ? dateV <= xDateV : dateV < xDateV)
          : (equal ? xDateV <= dateV : xDateV < dateV);
      })
      .sort((a, b) => {
        const av = new Date(a.body.date).valueOf();
        const bv = new Date(b.body.date).valueOf();
        return type === "after" ? bv - av : av - bv;
      })
      .slice(0, limit);

    const result = await this.aggregate(reses);
    if (type === "after") {
      result.reverse();
    }
    return result;
  }

  async findNoticeNew(authToken: IAuthToken, limit: number): Promise<Res[]> {
    const reses = this.reses
      .filter(x => x.type === "normal" && x.body.reply !== null && x.body.reply.user === authToken.user)
      .sort((a, b) => new Date(a.body.date).valueOf() - new Date(b.body.date).valueOf())
      .slice(0, limit);

    return await this.aggregate(reses);
  }

  async findHash(hash: string): Promise<Res[]> {
    const reses = this.reses
      .filter(x => x.body.hash === hash)
      .sort((a, b) => new Date(a.body.date).valueOf() - new Date(b.body.date).valueOf())
      .slice(0, Config.api.limit);

    return await this.aggregate(reses);
  }

  async findReply(res: Res): Promise<Res[]> {
    const reses = this.reses
      .filter(x => x.type === "normal" && x.body.reply !== null && x.body.reply.res === res.id)
      .sort((a, b) => new Date(a.body.date).valueOf() - new Date(b.body.date).valueOf())
      .slice(0, Config.api.limit);

    return await this.aggregate(reses);
  }

  async insert(res: Res): Promise<void> {
    this.reses.push(res.toDB());

    const resCount = (await this.resCount([res.topic])).get(res.topic) || 0;
    this.insertEvent.next({ res, count: resCount });
  }

  async update(res: Res): Promise<void> {
    this.reses[this.reses.findIndex(x => x.id === res.id)] = res.toDB();
  }

  async resCount(topicIDs: string[]): Promise<Map<string, number>> {
    return this.reses
      .filter(x => topicIDs.includes(x.body.topic))
      .map(x => x.body.topic)
      .reduce((c, x) => c.set(x, (c.get(x) || 0) + 1), new Map<string, number>());
  }

  private async aggregate(reses: IResDB[]): Promise<Res[]> {
    const data = this.reses.map(x => x.type === "normal" && x.body.reply !== null ? x.body.reply.res : null)
      .filter<string>((x): x is string => x !== null && reses.map(x => x.id).includes(x))
      .reduce((c, x) => c.set(x, (c.get(x) || 0) + 1), new Map<string, number>());
    return reses.map(r => fromDBToRes(r, data.get(r.id) || 0));
  }
}
