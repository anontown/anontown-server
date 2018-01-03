import { ObjectID } from "mongodb";
import {
  AtError,
  Client,
  IAuthTokenMaster,
  ObjectIDGenerator,
} from "../../";

describe("Client", () => {
  describe("create", () => {
    it("http:// から始まるURLで正常に呼び出せるか", () => {
      Client.create(
        ObjectIDGenerator,
        {
          id: ObjectIDGenerator(),
          key: "",
          user: ObjectIDGenerator(),
          type: "master",
        },
        "hoge",
        "http://hoge.com",
        new Date(),
      );
    });

    it("https:// から始まるURLで正常に呼び出せるか", () => {
      Client.create(
        ObjectIDGenerator,
        {
          id: ObjectIDGenerator(),
          key: "",
          user: ObjectIDGenerator(),
          type: "master",
        },
        "hoge",
        "https://hoge.com",
        new Date(),
      );
    });

    it("長い名前でエラーになるか", () => {
      expect(() => {
        Client.create(
          ObjectIDGenerator,
          {
            id: ObjectIDGenerator(),
            key: "",
            user: ObjectIDGenerator(),
            type: "master",
          },
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "http://hoge",
          new Date(),
        );
      }).toThrow(AtError);
    });

    it("名前が空文字でエラーになるか", () => {
      expect(() => {
        Client.create(
          ObjectIDGenerator,
          {
            id: ObjectIDGenerator(),
            key: "",
            user: ObjectIDGenerator(),
            type: "master",
          },
          "",
          "http://hoge",
          new Date(),
        );
      }).toThrow(AtError);
    });

    it("URLスキーマを不正にしたらエラーになるか", () => {
      expect(() => {
        Client.create(
          ObjectIDGenerator,
          {
            id: ObjectIDGenerator(),
            key: "",
            user: ObjectIDGenerator(),
            type: "master",
          },
          "hoge",
          "hogehttp://hoge.com",
          new Date(),
        );
      }).toThrow(AtError);
    });

    it("URLのホストなしでエラーになるか", () => {
      expect(() => {
        Client.create(
          ObjectIDGenerator,
          {
            id: ObjectIDGenerator(),
            key: "",
            user: ObjectIDGenerator(),
            type: "master",
          },
          "http://",
          "",
          new Date(),
        );
      }).toThrow(AtError);
    });

    it("URLが空でエラーになるか", () => {
      expect(() => {
        Client.create(
          ObjectIDGenerator,
          {
            id: ObjectIDGenerator(),
            key: "",
            user: ObjectIDGenerator(),
            type: "master",
          },
          "hoge",
          "",
          new Date(),
        );
      }).toThrow(AtError);
    });
  });

  describe("fromDB", () => {
    it("正常にインスタンス化出来るか", () => {
      const db = {
        _id: new ObjectID(),
        name: "name",
        url: "https://hoge.com",
        user: new ObjectID(),
        date: new Date(),
        update: new Date(),
      };

      const client = Client.fromDB(db);

      expect(db._id.toHexString()).toBe(client.id);
      expect(db.name).toBe(client.name);
      expect(db.url).toBe(client.url);
      expect(db.user.toHexString()).toBe(client.user);
      expect(db.date.getTime()).toBe(client.date.getTime());
      expect(db.update.getTime()).toBe(client.update.getTime());
    });
  });

  describe("#changeData", () => {
    it("正常に変更できるか", () => {
      const auth: IAuthTokenMaster = {
        id: ObjectIDGenerator(),
        key: "",
        user: ObjectIDGenerator(),
        type: "master",
      };

      const client = Client.create(ObjectIDGenerator,
        auth,
        "a",
        "https://a",
        new Date());

      client.changeData(auth, "name", "http://hoge", new Date());
    });

    it("違うユーザーが変更しようとしたらエラーになるか", () => {
      expect(() => {
        const auth: IAuthTokenMaster = {
          id: ObjectIDGenerator(),
          key: "",
          user: ObjectIDGenerator(),
          type: "master",
        };

        const client = Client.create(ObjectIDGenerator,
          auth,
          "hoge",
          "http://hoge",
          new Date());

        client.changeData({
          id: ObjectIDGenerator(),
          key: "",
          user: ObjectIDGenerator(),
          type: "master",
        }, "foo", "http://foo", new Date());
      }).toThrow(AtError);
    });

    it("長い名前でエラーになるか", () => {
      expect(() => {
        const auth: IAuthTokenMaster = {
          id: ObjectIDGenerator(),
          key: "",
          user: ObjectIDGenerator(),
          type: "master",
        };

        const client = Client.create(ObjectIDGenerator,
          auth,
          "hoge",
          "http://hoge",
          new Date());

        client.changeData(auth, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "http://foo", new Date());
      }).toThrow(AtError);
    });

    it("不正なURLでエラーになるか", () => {
      expect(() => {
        const auth: IAuthTokenMaster = {
          id: ObjectIDGenerator(),
          key: "",
          user: ObjectIDGenerator(),
          type: "master",
        };

        const client = Client.create(ObjectIDGenerator,
          auth,
          "hoge",
          "hogehttp://hoge",
          new Date());

        client.changeData(auth, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "http://foo", new Date());
      }).toThrow(AtError);
    });
  });

  {
    const client = Client.fromDB({
      _id: new ObjectID(),
      name: "name",
      url: "https://hoge.com",
      user: new ObjectID(),
      date: new Date(),
      update: new Date(),
    });

    describe("#toAPI", () => {
      it("認証あり(同一ユーザー)", () => {
        const api = client.toAPI({
          id: ObjectIDGenerator(),
          key: "",
          user: client.user,
          type: "master",
        });

        expect(client.id).toBe(api.id);
        expect(client.name).toBe(api.name);
        expect(client.url).toBe(api.url);
        expect(client.user).toBe(api.user);
        expect(client.date.toISOString()).toBe(api.date);
        expect(client.update.toISOString()).toBe(api.update);
      });

      it("認証あり(別ユーザー)", () => {
        const api = client.toAPI({
          id: ObjectIDGenerator(),
          key: "",
          user: ObjectIDGenerator(),
          type: "master",
        });

        expect(api.user).toBeNull();
      });

      it("認証無し", () => {
        const api = client.toAPI(null);

        expect(api.user).toBeNull();
      });
    });

    describe("#toDB", () => {
      it("正常に出力できるか", () => {
        const db = client.toDB();

        expect(client.id).toBe(db._id.toHexString());
        expect(client.name).toBe(db.name);
        expect(client.url).toBe(db.url);
        expect(client.user).toBe(db.user.toHexString());
        expect(client.date.getTime()).toBe(db.date.getTime());
        expect(client.update.getTime()).toBe(db.update.getTime());
      });
    });
  }
});
