import { IfTask } from "./queue";
import winston = require("winston");

/**
 * Principle
 * 
 * Task will be added at head, with push function
 * Task will be searched and deleted from tail, with search and delete function.
 * Because task comes first will be served early normally, which will speed up the whole searching process.
 * 
 */
let counter = 1;
export function createDLItemTask(): IfTask {
  return {
    id: counter++,
    running: false,
    finished: false,
    maxRetry: 1,
    times: 0,
    timeout: 3000,
    request: {
      funName: "1",
      args: 1,
    },
    callback: () => { }
  }
}


class DLItem {
  public next: DLItem | null;
  public prev: DLItem | null;
  public task: IfTask | null;

  constructor(task: IfTask) {

    this.task = {
      id: task.id,
      running: task.running,
      finished: task.finished,
      maxRetry: task.maxRetry,
      times: task.times,
      timeout: task.timeout,
      request: task.request,
      callback: task.callback,
    };

    this.next = null;
    this.prev = null;

  }
}
const HEAD_ID = -1;
const TAIL_ID = -2;
// double link list
export class DLList {
  private head: DLItem;
  private tail: DLItem;
  private logger: any;

  constructor(loggerPath: winston.LoggerInstance) {
    this.logger = loggerPath;
    this.head = new DLItem({
      id: HEAD_ID,
      running: false,
      finished: false,
      maxRetry: 1,
      times: 0,
      timeout: 3000,
      request: {
        funName: "1",
        args: 1,
      },
      callback: () => { }
    });
    this.tail = new DLItem({
      id: TAIL_ID,
      running: false,
      finished: false,
      maxRetry: 1,
      times: 0,
      timeout: 3000,
      request: {
        funName: "1",
        args: 1,
      },
      callback: () => { }
    });

    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
  // add to head
  public push(data: IfTask) {
    let item = new DLItem(data);

    let temp = this.head.next;
    temp!.prev = item;
    this.head.next = item;

    item.next = temp;
    item.prev = this.head;

  }
  public bEmpty() {
    return (this.head.next === this.tail && this.tail.prev == this.head)
  }
  public searchForward(task: IfTask) {
    let item: DLItem = this.head.next!;

    while (item !== this.tail) {
      if (item.task!.id === task.id) {
        return item;
      }
      item = item.next!;
    }
    return null;
  }

  public checkTailPrev() {
    return this.tail.prev!.task!.id === this.head.task!.id;
  }
  public checkHeadNext() {
    return this.head.next!.task!.id === this.tail.task!.id;
  }
  public getTasks() {
    let arr: IfTask[] = []
    let item: DLItem = this.tail.prev!;

    while (item.task!.id !== this.head.task!.id) {
      let task = item.task!;
      if (task.running === false) {
        arr.push(task);
      }
      item = item.prev!;
    }
    return arr;
  }
  public searchItem(task: IfTask) {
    return this.searchBackward(task);
  }
  public searchBackward(task: IfTask): DLItem | null {
    let item: DLItem = this.tail.prev!;

    while (item !== this.head) {
      if (item.task!.id === task.id) {
        return item;
      }
      item = item.prev!;
    }
    return null;
  }
  public deleteItem(item: DLItem) {
    let itemPrev = item.prev;
    let itemNext = item.next;
    itemPrev!.next = itemNext;
    itemNext!.prev = itemPrev;

    item.next = null;
    item.prev = null;
    item.task = null;
  }
  public length() {
    let i = 0;
    let item = this.head.next;
    while (item !== this.tail) {
      i++;
      item = item!.next;
    }
    return i;
  }
  public print() {
    let item = this.head.next;
    this.logger.info('-------------------------------')
    while (item !== this.tail) {
      this.logger.info(item!.task!.id, 'task')
      item = item!.next
    }
    this.logger.info('-------------------------------\n')
  }
}
