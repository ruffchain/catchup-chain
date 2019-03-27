import { IfTask } from "./queue";
import winston = require("winston");

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
  // add to tail
  public push(data: IfTask) {
    let item = new DLItem(data);

    let temp = this.tail.prev;
    temp!.next = item;
    item.prev = temp;
    item.next = this.tail;
    this.tail.prev = item;
  }
  public pop() {
    if (this.bEmpty()) {
      this.logger.info('DLList is empty')
    } else {
      let tempEnd = this.tail!.prev;
      let tempEndNew = tempEnd!.prev;

      tempEndNew!.next = this.tail;
      this.tail.prev = tempEndNew;
    }
  }
  public bEmpty() {
    return (this.head.next === this.tail && this.tail.prev == this.head)
  }
}
