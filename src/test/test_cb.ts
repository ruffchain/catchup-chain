console.log('test callback');

function func1() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('func1 returned');
      resolve('func1');
    }, 3000);
  });
}

function func2() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('func2 returned');
      resolve('func2');
    }, 3000);
  });
}

let globalResolve: any;
let globalReject: any;

function func3() {
  return new Promise((resolve, reject) => {
    globalResolve = resolve;
    globalReject = reject;
  });
}
async function funcTry() {
  console.log('try function');
  let result = await func1();
  console.log(':', result);
  result = await func2();
  console.log(':', result);
  result = await func3();
  console.log(':', result);
}

funcTry();

setTimeout(() => {
  globalResolve('ok');
}, 10000);
