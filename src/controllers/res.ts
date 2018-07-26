import { AtPrerequisiteError } from "../at-error";
import { ObjectIDGenerator } from "../generator";
import {
  IResAPI,
  IResFindQuery,
  ResNormal,
} from "../models";
import {
  Context,
  controller,
  DateType,
  http,
  IHttpAPICallParams,
} from "../server";

export const resResolver = {
  Query: {
    reses: async (_obj: any,
      args: {
        id: string[] | null,
        topic: string | null,
        notice: boolean | null,
        hash: string | null,
        reply: string | null,
        profile: string | null,
        self: boolean | null,
        text: string | null,
        date: DateType | null,
        limit: number,
      }, context: Context,
      _info: any) => {
      const reses = await context.repo.res.find2(context.auth, {
        id: args.id,
        topic: args.topic,
        notice: args.notice,
        hash: args.hash,
        reply: args.reply,
        profile: args.profile,
        self: args.self,
        text: args.text,
        date: args.date,
      }, args.limit);
      return reses.map(x => x.toAPI(context.auth.tokenOrNull));
    },
  },
  Mutation: {
    createRes: async (_obj: any,
      args: {
        topic: string,
        name: string | null,
        text: string,
        reply: string | null,
        profile: string | null,
        age: boolean,
      }, context: Context,
      _info: any) => {
      const [topic, user, reply, profile] = await Promise.all([
        context.repo.topic.findOne(args.topic),
        context.repo.user.findOne(context.auth.token.user),
        args.reply !== null ? context.repo.res.findOne(args.reply) : Promise.resolve(null),
        args.profile !== null ? context.repo.profile.findOne(args.profile) : Promise.resolve(null),
      ]);

      const { res, user: newUser, topic: newTopic } = ResNormal.create(ObjectIDGenerator,
        topic,
        user,
        context.auth.token,
        args.name,
        args.text,
        reply,
        profile,
        args.age,
        context.now);

      await Promise.all([
        context.repo.res.insert(res),
        context.repo.topic.update(newTopic),
        context.repo.user.update(newUser),
      ]);

      context.log("reses", res.id);
      return res.toAPI(context.auth.token);
    },
    voteRes: async (_obj: any,
      args: {
        id: string,
        vote: "uv" | "dv" | "cv"
      }, context: Context,
      _info: any) => {
      if (args.vote === "cv") {
        const [res, user] = await Promise.all([
          context.repo.res.findOne(args.id),
          context.repo.user.findOne(context.auth.token.user),
        ]);

        // レスを書き込んだユーザー
        const resUser = await context.repo.user.findOne(res.user);

        const { res: newRes, resUser: newResUser } = res.cv(resUser, user, context.auth.token);

        await Promise.all([
          context.repo.res.update(newRes),
          context.repo.user.update(newResUser),
          context.repo.user.update(user),
        ]);

        return newRes.toAPI(context.auth.token);
      } else {
        const [res, user] = await Promise.all([
          context.repo.res.findOne(args.id),
          context.repo.user.findOne(context.auth.token.user),
        ]);

        // レスを書き込んだユーザー
        const resUser = await context.repo.user.findOne(res.user);

        const { res: newRes, resUser: newResUser } = res.v(resUser, user, args.vote, context.auth.token);

        await Promise.all([
          context.repo.res.update(newRes),
          context.repo.user.update(newResUser),
          context.repo.user.update(user),
        ]);

        return newRes.toAPI(context.auth.token);
      }
    },
    delRes: async (_obj: any,
      args: {
        id: string,
      }, context: Context,
      _info: any) => {
      const res = await context.repo.res.findOne(args.id);

      if (res.type !== "normal") {
        throw new AtPrerequisiteError("通常レス以外は削除出来ません");
      }

      // レスを書き込んだユーザー
      const resUser = await context.repo.user.findOne(res.user);

      const { res: newRes, resUser: newResUser } = res.del(resUser, context.auth.token);

      await Promise.all([
        context.repo.res.update(newRes),
        context.repo.user.update(newResUser),
      ]);

      return newRes.toAPI(context.auth.token);
    }
  },
};

@controller
export class ResController {
  @http({
    url: "/res/create",

    isAuthUser: false,
    isAuthToken: "all",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["topic", "name", "text", "reply", "profile", "age"],
      properties: {
        topic: {
          type: "string",
        },
        name: {
          type: ["string", "null"],
        },
        text: {
          type: "string",
        },
        reply: {
          type: ["string", "null"],
        },
        profile: {
          type: ["string", "null"],
        },
        age: {
          type: "boolean",
        },
      },
    },
  })
  async create({ params, auth, now, repo, log }: IHttpAPICallParams<{
    topic: string,
    name: string | null,
    text: string,
    reply: string | null,
    profile: string | null,
    age: boolean,
  }>): Promise<IResAPI> {
    const [topic, user, reply, profile] = await Promise.all([
      repo.topic.findOne(params.topic),
      repo.user.findOne(auth.token.user),
      params.reply !== null ? repo.res.findOne(params.reply) : Promise.resolve(null),
      params.profile !== null ? repo.profile.findOne(params.profile) : Promise.resolve(null),
    ]);

    const { res, user: newUser, topic: newTopic } = ResNormal.create(ObjectIDGenerator,
      topic,
      user,
      auth.token,
      params.name,
      params.text,
      reply,
      profile,
      params.age,
      now);

    await Promise.all([
      repo.res.insert(res),
      repo.topic.update(newTopic),
      repo.user.update(newUser),
    ]);

    log("reses", res.id);
    return res.toAPI(auth.token);
  }

  @http({
    url: "/res/find/one",

    isAuthUser: false,
    isAuthToken: "no",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: {
          type: "string",
        },
      },
    },
  })
  async findOne({ params, auth, repo }: IHttpAPICallParams<{ id: string }>): Promise<IResAPI> {
    const res = await repo.res.findOne(params.id);
    return res.toAPI(auth.tokenOrNull);
  }

  @http({
    url: "/res/find/in",

    isAuthUser: false,
    isAuthToken: "no",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["ids"],
      properties: {
        ids: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
    },
  })
  async findIn({ params, auth, repo }: IHttpAPICallParams<{ ids: string[] }>): Promise<IResAPI[]> {
    const reses = await repo.res.findIn(params.ids);
    return reses.map(r => r.toAPI(auth.tokenOrNull));
  }

  @http({
    url: "/res/find",

    isAuthUser: false,
    isAuthToken: "no",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["query", "type", "date", "limit"],
      properties: {
        query: {
          type: "object",
          additionalProperties: false,
          properties: {
            topic: {
              type: "string",
            },
            notice: {
              type: "boolean",
            },
            hash: {
              type: "string",
            },
            reply: {
              type: ["string"],
            },
            profile: {
              type: "string",
            },
            self: {
              type: "boolean",
            },
            text: {
              type: "string",
            },
          },
        },
        type: {
          type: "string",
          enum: ["gt", "gte", "lt", "lte"],
        },
        date: {
          type: "string",
          format: "date-time",
        },
        limit: {
          type: "integer",
        },
      },
    },
  })
  async find({ params, auth, repo }: IHttpAPICallParams<{
    query: IResFindQuery,
    type: "gt" | "gte" | "lt" | "lte",
    date: string,
    limit: number,
  }>): Promise<IResAPI[]> {
    const reses = await repo.res.find(params.query, auth.tokenOrNull, params.type, new Date(params.date), params.limit);
    return reses.map(r => r.toAPI(auth.tokenOrNull));
  }

  @http({
    url: "/res/uv",

    isAuthUser: false,
    isAuthToken: "all",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: {
          type: "string",
        },
      },
    },
  })
  async uv({ params, auth, repo }: IHttpAPICallParams<{ id: string }>): Promise<IResAPI> {
    const [res, user] = await Promise.all([
      repo.res.findOne(params.id),
      repo.user.findOne(auth.token.user),
    ]);

    // レスを書き込んだユーザー
    const resUser = await repo.user.findOne(res.user);

    const { res: newRes, resUser: newResUser } = res.v(resUser, user, "uv", auth.token);

    await Promise.all([
      repo.res.update(newRes),
      repo.user.update(newResUser),
      repo.user.update(user),
    ]);

    return newRes.toAPI(auth.token);
  }

  @http({
    url: "/res/dv",

    isAuthUser: false,
    isAuthToken: "all",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: {
          type: "string",
        },
      },
    },
  })
  async dv({ params, auth, repo }: IHttpAPICallParams<{ id: string }>): Promise<IResAPI> {
    const [res, user] = await Promise.all([
      repo.res.findOne(params.id),
      repo.user.findOne(auth.token.user),
    ]);

    // レスを書き込んだユーザー
    const resUser = await repo.user.findOne(res.user);

    const { res: newRes, resUser: newResUser } = res.v(resUser, user, "dv", auth.token);

    const promise = [
      repo.res.update(newRes),
      repo.user.update(newResUser),
      repo.user.update(user),
    ];

    await Promise.all(promise);

    return newRes.toAPI(auth.token);
  }

  @http({
    url: "/res/cv",

    isAuthUser: false,
    isAuthToken: "all",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: {
          type: "string",
        },
      },
    },
  })
  async cv({ params, auth, repo }: IHttpAPICallParams<{ id: string }>): Promise<IResAPI> {
    const [res, user] = await Promise.all([
      repo.res.findOne(params.id),
      repo.user.findOne(auth.token.user),
    ]);

    // レスを書き込んだユーザー
    const resUser = await repo.user.findOne(res.user);

    const { res: newRes, resUser: newResUser } = res.cv(resUser, user, auth.token);

    await Promise.all([
      repo.res.update(newRes),
      repo.user.update(newResUser),
      repo.user.update(user),
    ]);

    return newRes.toAPI(auth.token);
  }

  @http({
    url: "/res/del",

    isAuthUser: false,
    isAuthToken: "all",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: {
          type: "string",
        },
      },
    },
  })
  async del({ params, auth, repo }: IHttpAPICallParams<{ id: string }>): Promise<IResAPI> {
    // レス
    const res = await repo.res.findOne(params.id);

    if (res.type !== "normal") {
      throw new AtPrerequisiteError("通常レス以外は削除出来ません");
    }

    // レスを書き込んだユーザー
    const resUser = await repo.user.findOne(res.user);

    const { res: newRes, resUser: newResUser } = res.del(resUser, auth.token);

    await Promise.all([
      repo.res.update(newRes),
      repo.user.update(newResUser),
    ]);

    return newRes.toAPI(auth.token);
  }
}
