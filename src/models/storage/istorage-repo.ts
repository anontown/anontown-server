import { IAuthToken } from "../../auth";
import { Storage } from "./storage";

export interface IStorageRepo {
  findOneKey(token: IAuthToken, key: string): Promise<Storage>;
  find(token: IAuthToken, query: { key: string[] | null }): Promise<Storage[]>;
  save(storage: Storage): Promise<void>;
  del(storage: Storage): Promise<void>;
  list(token: IAuthToken): Promise<string[]>;
}
