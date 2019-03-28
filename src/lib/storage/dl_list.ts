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

  constructor(task: IfTask | null) {
    this.task = task;
    this.next = null;
    this.prev = null;

  }
}
// double link list
export class DLList {
  private head: DLItem;
  private tail: DLItem;
  private logger: any;

  constructor(loggerPath: winston.LoggerInstance) {
    this.logger = loggerPath;
    this.head = new DLItem(null);
    this.tail = new DLItem(null);

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
  // public pop() {
  //   if (this.bEmpty()) {
  //     this.logger.info('DLList is empty')
  //   } else {
  //     let tempEnd = this.tail!.prev;
  //     let tempEndNew = tempEnd!.prev;

  //     tempEndNew!.next = this.tail;
  //     this.tail.prev = tempEndNew;
  //   }
  // }
  public bEmpty() {
    return (this.head.next === this.tail && this.tail.prev == this.head)
  }
  public searchForward(task: IfTask) {
    let item: DLItem = this.head.next!;

    while (item !== this.tail) {
      if (item.task === task) {
        return item;
      }
      item = item.next!;

    }
    return null;
  }
  public searchItem(task: IfTask) {
    return this.searchBackward(task);
  }
  public searchBackward(task: IfTask) {
    let item: DLItem = this.tail.prev!;

    while (item !== this.head) {
      if (item.task === task) {
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
