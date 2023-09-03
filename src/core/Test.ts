import { moveSync } from "fs-extra";
import { resolve } from "path";
import { makeFullPath } from "~/util/IO";

moveSync(resolve(__dirname, './dir1'), resolve(__dirname, './dir2'))