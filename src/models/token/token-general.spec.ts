import * as Im from "immutable";
import { ObjectID } from "mongodb";
import {
  Client,
  IAuthTokenMaster,
  ITokenGeneralDB,
  ObjectIDGenerator,
  TokenBase,
  TokenGeneral,
} from "../../";

describe("TokenMaster", () => {
  const client = new Client(ObjectIDGenerator(),
    "name",
    "https://hoge.com",
    ObjectIDGenerator(),
    new Date(),
    new Date());

  const auth: IAuthTokenMaster = {
    id: ObjectIDGenerator(),
    key: "key",
    user: ObjectIDGenerator(),
    type: "master",
  };

  const token = new TokenGeneral(ObjectIDGenerator(),
    "key",
    ObjectIDGenerator(),
    ObjectIDGenerator(),
    Im.List(),
    new Date());

  describe("fromDB", () => {
    it("正常に変換出来るか", () => {
      const db: ITokenGeneralDB = {
        _id: new ObjectID(ObjectIDGenerator()),
        key: "key",
        type: "general",
        client: new ObjectID(ObjectIDGenerator()),
        user: new ObjectID(ObjectIDGenerator()),
        date: new Date(),
        req: [],
      };
      const token = TokenGeneral.fromDB(db);

      expect(token.id).toBe(db._id.toHexString());
      expect(token.key).toBe(db.key);
      expect(token.type).toBe(db.type);
      expect(token.user).toBe(db.user.toHexString());
      expect(token.date).toEqual(db.date);
      expect(token.client).toBe(db.client.toHexString());
      expect(token.req).toEqual(Im.List(db.req));
    });
  });

  describe("create", () => {
    it("正常に作成出来るか", () => {
      const id = ObjectIDGenerator();
      const now = new Date();
      const token = TokenGeneral.create(() => id, auth, client, now, () => "random");

      expect(token.id).toBe(id);
      expect(token.key).toBe(TokenBase.createTokenKey(() => "random"));
      expect(token.type).toBe("general");
      expect(token.user).toBe(auth.user);
      expect(token.date).toEqual(now);
      expect(token.client).toBe(client.id);
      expect(token.req).toEqual(Im.List());
    });
  });

  describe("toDB", () => {
    it("正常に変換出来るか", () => {
      expect(token.toDB()).toEqual({
        ...token.toBaseDB(),
        client: new ObjectID(token.client),
        req: [],
      });
    });
  });

  describe("toAPI", () => {
    it("正常に変換出来るか", () => {
      expect(token.toAPI()).toEqual({
        ...token.toBaseAPI(),
        client: token.client,
      });
    });
  });

  describe("createReq", () => {
    it("正常に追加出来るか", () => {
      const date = new Date(0);
      const { token: newToken, req } = token.createReq(date, () => "random");
      const r = {
        key: TokenBase.createTokenKey(() => "random"),
        expireDate: new Date(300000),
      };
      expect(req).toEqual(r);
      expect(newToken).toEqual(token.copy({ req: Im.List([{ ...r, active: true }]) }));
    });

    it("期限切れのトークンと死んでいるトークンが削除されてるか", () => {
      const date = new Date(100);
      const { token: newToken, req } = token.copy({
        req: Im.List([
          {
            key: "a",
            expireDate: new Date(50),
            active: true
          },
          {
            key: "b",
            expireDate: new Date(150),
            active: false
          },
          {
            key: "c",
            expireDate: new Date(150),
            active: true
          },
        ])
      }).createReq(date, () => "random");
      const r = {
        key: TokenBase.createTokenKey(() => "random"),
        expireDate: new Date(300100),
      };
      expect(req).toEqual(r);
      expect(newToken).toEqual(token.copy({
        req: Im.List([
          {
            key: "c",
            expireDate: new Date(150),
            active: true
          },
          { ...r, active: true }
        ])
      }));
    });
  });
});
