import { describe, it } from 'mocha';
import { Logger } from '../api/logger';
let expect = require('chai').expect;
import { DLList, createDLItemTask } from '../lib/storage/dl_list'

const logger = Logger.init({
  path: './data/log/'
});

const lst = new DLList(logger);
let task1 = createDLItemTask();
let task2 = createDLItemTask();
let task3 = createDLItemTask();
let task4 = createDLItemTask();
let task5 = createDLItemTask();
let task6 = createDLItemTask();
let task7 = createDLItemTask();
let task8 = createDLItemTask();
let task9 = createDLItemTask();
let task10 = createDLItemTask();

describe('To test Catchup v1.0.2 double link list', async function () {
  this.timeout(100000);
  it('list empty', async () => {
    logger.info('Is it empty? ', lst.bEmpty(), '\n')
    expect(lst.bEmpty()).to.equal(true);
  })
  it('Add to list', async () => {

    lst.push(task1)
    lst.push(task2)
    lst.push(task3)
    lst.push(task4)
    lst.push(task5)
    lst.push(task6)
    lst.push(task7)
    lst.push(task8)
    lst.push(task9)
    lst.push(task10)

    expect(lst.length()).to.equal(10);
  })
  it('print list', async () => {
    lst.print()
    expect(5).to.equal(5);
  })
  it('delete task2', async () => {
    let item = lst.searchBackward(task2);
    if (item !== null) {
      lst.deleteItem(item);
    }
    lst.print()
    expect(5).to.equal(5);
  })
  it('delete task1', async () => {
    let item = lst.searchBackward(task1);
    if (item !== null) {
      lst.deleteItem(item);
    }
    lst.print()
    expect(5).to.equal(5);
  })
  it('delete task10', async () => {
    let item = lst.searchBackward(task10);
    if (item !== null) {
      lst.deleteItem(item);
    }
    lst.print()
    expect(5).to.equal(5);
  })
});
