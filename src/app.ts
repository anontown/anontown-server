/* tslint:disable:no-var-requires */
require("source-map-support").install();
import * as fs from "fs-promise";
import { Config } from "./config";
import { addAPI } from "./controllers";
import { createDB } from "./create-db";
import {  } from "./generator";
import {
  Repo,
} from "./models";
import { AppServer } from "./server/app-server";

(async () => {
  // フォルダ作成
  try {
    await fs.mkdir("logs");
  } catch {
    /* tslint:disable:no-empty */
  }

  try {
    await fs.mkdir("data");
  } catch {
    /* tslint:disable:no-empty */
  }

  await createDB();

  const api = new AppServer(Config.server.port, new Repo());

  addAPI(api);

  api.run();
})();
