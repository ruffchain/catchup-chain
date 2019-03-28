
console.log('test token id')

const REGPAT = /^[A-Z]{1}[0-9A-Z]{2,11}$/g

let token = 'abc123'.toUpperCase();
let result = token.match(REGPAT);

console.log(result)

function numNumbers(str: string) {
  let lst = str.split('');
  let counter = 0;

  for (let i = 0; i < lst.length; i++) {
    if (isNaN(parseInt(lst[i]))) {
      counter++;
    }
  }
  return str.length - counter;

}
token = '1abc123'.toUpperCase();
result = token.match(REGPAT);

console.log(result)

token = 'abc-123'.toUpperCase();
result = token.match(REGPAT);

console.log(result)


token = '1abc012345678'.toUpperCase();
result = token.match(REGPAT);

console.log(result)

token = 'bd'.toUpperCase();
result = token.match(REGPAT);

console.log(result)

token = '1abcqweeqw'.toUpperCase();
console.log(numNumbers(token))
