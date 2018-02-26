import * as Im from "immutable";
import {
  TopicNormal,
  User,
  IAuthTokenMaster,
  History,
  ResHistory,
} from "../../";

describe("TopicNormal", () => {
  const topic = new TopicNormal("topic",
    "title",
    Im.List(),
    "body",
    new Date(100),
    new Date(0),
    5,
    new Date(50),
    true);

  const user = new User("user",
    "sn",
    "pass",
    10,
    {
      last: new Date(0),
      m10: 0,
      m30: 0,
      h1: 0,
      h6: 0,
      h12: 0,
      d1: 0,
    },
    new Date(0),
    new Date(0),
    0,
    new Date(0));

  const auth: IAuthTokenMaster = {
    id: "token",
    key: "key",
    user: "user",
    type: "master",
  };

  describe("create", () => {
    it("正常に生成出来るか", () => {
      expect(TopicNormal.create(() => "topic",
        "title",
        [],
        "body",
        user,
        auth,
        new Date(24 * 60 * 60 * 1000))).toEqual({
          topic: topic.copy({
            date: new Date(24 * 60 * 60 * 1000),
            update: new Date(24 * 60 * 60 * 1000),
            ageUpdate: new Date(24 * 60 * 60 * 1000)
          }),
          history: new History("topic",
            "topic",
            "title",
            Im.List(),
            "body",
            new Date(24 * 60 * 60 * 1000),
            topic.hash(new Date(24 * 60 * 60 * 1000), user),
            "user"),
          res: new ResHistory("topic",
            "topic",
            "topic",
            new Date(24 * 60 * 60 * 1000),
            "user",
            Im.List(),
            50,
            topic.hash(new Date(24 * 60 * 60 * 1000), user),
            0),
          user: user.copy({ lastTopic: new Date(24 * 60 * 60 * 1000) })
        });
    });
  });
});