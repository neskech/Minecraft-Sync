import chok from "chokidar";

export function logDebug(...args: any) {
  console.log(...args, "color: #f2e449");
}

function fileFromPath(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash == -1) return path;
  return path.substring(lastSlash + 1);
}

export type Operation = "added" | "removed" | "changed";
export type FileDescriptor = {
    name: string,
    operation: Operation
}

export default class FileSysWatcher {
  private registry: Map<string, Operation>;
  private directory: string;
  private watcher: chok.FSWatcher;
  private logging = false;

  constructor(directory: string, ignore = /^\./) {
    this.watcher = chok.watch(directory, { ignored: ignore, persistent: true });
    this.registry = new Map()
    this.directory = directory
  }

  onAdd(path: string) {
    const file = fileFromPath(path);

    if (this.logging && this.registry.has(file))
      logDebug(
        `File ${file} changed from state '${this.registry.get(
          file
        )}' to 'added'`
      );
    else if (this.logging) logDebug(`File '${file}' added to file system`);

    this.registry.set(path, "added");
  }

  onChange(path: string) {
    const file = fileFromPath(path);

    if (this.logging && this.registry.has(file))
      logDebug(
        `File ${file} changed from state '${this.registry.get(
          file
        )}' to 'changed'`
      );
    else if (this.logging) logDebug(`File '${file}' changed`);

    this.registry.set(path, "changed");
  }

  onDelete(path: string) {
    const file = fileFromPath(path);

    if (this.logging && this.registry.has(file))
      logDebug(
        `File ${file} changed from state '${this.registry.get(
          file
        )}' to 'removed'`
      );
    else if (this.logging) logDebug(`File ${file} removed from file system`);

    this.registry.set(path, "removed");
  }

  public getReport(): FileDescriptor[] {
    const arr = [] as FileDescriptor[]
    for (const [key, value] of this.registry) {
        arr.push({
            name: key,
            operation: value
        })
    }
    return arr
  }

  public stopWatching() {
    this.watcher.unwatch(this.directory)
  }

  public toString(): string {
    return `
        Watch Directory: ${this.directory}
        Logging: ${this.logging}

        Registry: ${JSON.stringify(this.registry)}
    `
  }

  public enableLogging() {
    this.logging = true;
  }

  public disableLogging() {
    this.logging = true;
  }
}
