import { IfTask } from "./queue";
import winston = require("winston");


class SLNode {
  public next: SLNode | null;
  public task: IfTask | null;

  constructor(task: IfTask | null) {
    this.task = task;
    this.next = null;
  }
}

export class SLList {
  private head: SLNode;
  private logger: any;

  constructor(loggerPath: winston.LoggerInstance) {
    this.head = new SLNode(null);
    this.head.next = null;
    this.logger = loggerPath;
  }
  public find(task: IfTask) {
    let currNode = this.head;
    while (currNode.task !== task) {
      currNode = currNode.next!;
    }
    return currNode;
  }
  public push(task: IfTask) {
    let node = new SLNode(task);

    node.next = this.head.next;
    this.head.next = node;
  }
  public pop(task: IfTask) {

  }
  public insert() {

  }
  public remove(task: IfTask) {
    let currNode = this.head;
    while (currNode.next !== null) {
      if (currNode.next.task === task) {
        break;
      }
    }
    
    let node = currNode.next!.next;
    currNode.next = node;

  }
  public display() {
    let currNode = this.head;
    while (currNode.next !== null) {
      this.logger.info(currNode.next.task);
    }
  }
}
