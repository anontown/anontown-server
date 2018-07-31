import { AtNotFoundError } from "../../at-error";
import { Config } from "../../config";
import { ESClient } from "../../db";
import { History, IHistoryDB } from "./history";
import { IHistoryRepo } from "./ihistory-repo";

export class HistoryRepo implements IHistoryRepo {
  constructor(private refresh?: boolean) { }

  async insert(history: History): Promise<void> {
    const hDB = history.toDB();
    await ESClient.create({
      index: "histories",
      type: "doc",
      id: hDB.id,
      body: hDB.body,
      refresh: this.refresh,
    });
  }

  async update(history: History): Promise<void> {
    const hDB = history.toDB();
    await ESClient.index({
      index: "histories",
      type: "doc",
      id: hDB.id,
      body: hDB.body,
      refresh: this.refresh !== undefined ? this.refresh.toString() : undefined,
    });
  }

  async findOne(id: string): Promise<History> {
    let history;
    try {
      history = await ESClient.get<IHistoryDB["body"]>({
        index: "histories",
        type: "doc",
        id,
      });
    } catch {
      throw new AtNotFoundError("編集履歴が存在しません");
    }

    return History.fromDB(({ id: history._id, body: history._source }));
  }

  async find(query: { id?: string[], topic?: string[] }): Promise<History[]> {
    const filter: any[] = [];
    if (query.id !== undefined) {
      filter.push({
        terms: {
          _id: query.id,
        },
      });
    }

    if (query.topic !== undefined) {
      filter.push({
        terms: {
          topic: query.topic,
        },
      });
    }

    const histories = await ESClient.search<IHistoryDB["body"]>({
      index: "histories",
      size: Config.api.limit,
      body: {
        query: {
          bool: {
            filter,
          },
        },
        sort: { date: { order: "desc" } },
      },
    });

    return histories.hits.hits.map(h => History.fromDB({ id: h._id, body: h._source }));
  }
}
