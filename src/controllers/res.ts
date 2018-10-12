import { withFilter } from "apollo-server";
import { fromNullable, some } from "fp-ts/lib/Option";
import { AtNotFoundError } from "../at-error";
import { ObjectIDGenerator } from "../generator";
import {
  IRepo,
  IResAPI,
  IResForkAPI,
  IResHistoryAPI,
  IResNormalAPI,
  Res,
  ResNormal,
  ResQuery,
} from "../models";
import {
  Context,
} from "../server";
import { pubsub, RES_ADDED } from "../server/pubsub";

export const resResolver = (repo: IRepo) => {
  repo.res.insertEvent.subscribe(data => {
    pubsub.publish(RES_ADDED, data);
  });

  return {
    Query: {
      reses: async (
        _obj: any,
        args: {
          query: ResQuery,
          limit: number,
        },
        context: Context,
        _info: any) => {
        const reses = await repo.res.find(context.auth, args.query, args.limit);
        return reses.map(x => x.toAPI(context.auth.tokenOrNull));
      },
    },
    Mutation: {
      createRes: async (
        _obj: any,
        args: {
          topic: string,
          name?: string,
          text: string,
          reply?: string,
          profile?: string,
          age: boolean,
        },
        context: Context,
        _info: any) => {
        const [topic, user, reply, profile] = await Promise.all([
          repo.topic.findOne(args.topic),
          repo.user.findOne(context.auth.token.user),
          args.reply !== undefined ? repo.res.findOne(args.reply) : Promise.resolve(null),
          args.profile !== undefined ? repo.profile.findOne(args.profile) : Promise.resolve(null),
        ]);

        const { res, user: newUser, topic: newTopic } = ResNormal.create(ObjectIDGenerator,
          topic,
          user,
          context.auth.token,
          fromNullable(args.name),
          args.text,
          fromNullable(reply),
          fromNullable(profile),
          args.age,
          context.now);

        await Promise.all([
          repo.res.insert(res),
          repo.topic.update(newTopic),
          repo.user.update(newUser),
        ]);

        context.log("reses", res.id);
        return res.toAPI(some(context.auth.token));
      },
      voteRes: async (
        _obj: any,
        args: {
          id: string,
          vote: "uv" | "dv" | "cv",
        },
        context: Context,
        _info: any) => {
        if (args.vote === "cv") {
          const [res, user] = await Promise.all([
            repo.res.findOne(args.id),
            repo.user.findOne(context.auth.token.user),
          ]);

          // レスを書き込んだユーザー
          const resUser = await repo.user.findOne(res.user);

          const { res: newRes, resUser: newResUser } = res.cv(resUser, user, context.auth.token);

          await Promise.all([
            repo.res.update(newRes),
            repo.user.update(newResUser),
            repo.user.update(user),
          ]);

          return newRes.toAPI(some(context.auth.token));
        } else {
          const [res, user] = await Promise.all([
            repo.res.findOne(args.id),
            repo.user.findOne(context.auth.token.user),
          ]);

          // レスを書き込んだユーザー
          const resUser = await repo.user.findOne(res.user);

          const { res: newRes, resUser: newResUser } = res.v(resUser, user, args.vote, context.auth.token);

          await Promise.all([
            repo.res.update(newRes),
            repo.user.update(newResUser),
            repo.user.update(user),
          ]);

          return newRes.toAPI(some(context.auth.token));
        }
      },
      delRes: async (
        _obj: any,
        args: {
          id: string,
        },
        context: Context,
        _info: any) => {
        const res = await repo.res.findOne(args.id);

        if (res.type !== "normal") {
          throw new AtNotFoundError("レスが見つかりません");
        }

        // レスを書き込んだユーザー
        const resUser = await repo.user.findOne(res.user);

        const { res: newRes, resUser: newResUser } = res.del(resUser, context.auth.token);

        await Promise.all([
          repo.res.update(newRes),
          repo.user.update(newResUser),
        ]);

        return newRes.toAPI(some(context.auth.token));
      },
    },
    Subscription: {
      resAdded: {
        resolve: (payload: { res: Res, count: number }, _args: any, context: Context, _info: any) => {
          return { ...payload, res: payload.res.toAPI(context.auth.tokenOrNull) };
        },
        subscribe: () => withFilter(
          () => pubsub.asyncIterator(RES_ADDED),
          (payload: { res: Res, count: number }, args: { topic: string }) => {
            return payload.res.topic === args.topic;
          },
        ),
      },
    },
    Res: {
      __resolveType(obj: IResAPI) {
        switch (obj.type) {
          case "normal":
            return "ResNormal";
          case "history":
            return "ResHistory";
          case "topic":
            return "ResTopic";
          case "fork":
            return "ResFork";
          case "delete":
            return "ResDelete";
        }
      },
      topic: async (
        res: IResAPI,
        _args: {},
        context: Context,
        _info: any) => {
        const topic = await context.loader.topic.load(res.topicID);
        return topic.toAPI();
      },
    },
    ResNormal: {
      reply: async (
        res: IResNormalAPI,
        _args: {},
        context: Context,
        _info: any) => {
        if (res.replyID !== null) {
          const reply = await context.loader.res.load(res.replyID);
          return reply.toAPI(context.auth.tokenOrNull);
        } else {
          return null;
        }
      },
      profile: async (
        res: IResNormalAPI,
        _args: {},
        context: Context,
        _info: any) => {
        if (res.profileID !== null) {
          const profile = await context.loader.profile.load(res.profileID);
          return profile.toAPI(context.auth.tokenOrNull);
        } else {
          return null;
        }
      },
    },
    ResHistory: {
      history: async (
        res: IResHistoryAPI,
        _args: {},
        context: Context,
        _info: any) => {
        const history = await context.loader.history.load(res.historyID);
        return history.toAPI(context.auth.tokenOrNull);
      },
    },
    ResTopic: {
    },
    ResFork: {
      fork: async (
        res: IResForkAPI,
        _args: {},
        context: Context,
        _info: any) => {
        const fork = await context.loader.topic.load(res.forkID);
        return fork.toAPI();
      },
    },
    ResDelete: {
    },
  };
};
