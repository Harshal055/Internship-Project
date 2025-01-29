export const javascriptQuestions = {
    
        
          "easy": [
            {
              "id": "js_e1",
              "question": "What is the correct syntax to output 'Hello World' in JavaScript?",
              "options": [
                "print('Hello World')",
                "console.log('Hello World')",
                "System.out.println('Hello World')",
                "echo('Hello World')"
              ],
              "answer": "console.log('Hello World')",
              "points": 10
            },
            {
              "id": "js_e2",
              "question": "Which data type is NOT supported in JavaScript?",
              "options": [
                "String",
                "Number",
                "Float",
                "Boolean"
              ],
              "answer": "Float",
              "points": 10
            },
            {
              "id": "js_e3",
              "question": "Which company developed JavaScript?",
              "options": [
                "Microsoft",
                "Google",
                "Netscape",
                "Apple"
              ],
              "answer": "Netscape",
              "points": 10
            },
            {
              "id": "js_e4",
              "question": "How do you create a function in JavaScript?",
              "options": [
                "function myFunction()",
                "function:myFunction()",
                "def myFunction()",
                "func myFunction()"
              ],
              "answer": "function myFunction()",
              "points": 10
            },
            {
              "id": "js_e5",
              "question": "How do you call a function named myFunction?",
              "options": [
                "call myFunction()",
                "myFunction()",
                "call function myFunction",
                "execute myFunction()"
              ],
              "answer": "myFunction()",
              "points": 10
            },
            {
              "id": "js_e6",
              "question": "What is the output of typeof null?",
              "options": [
                "\"null\"",
                "\"object\"",
                "\"undefined\"",
                "\"number\""
              ],
              "answer": "\"object\"",
              "points": 10
            },
            {
              "id": "js_e7",
              "question": "How do you create an array in JavaScript?",
              "options": [
                "var arr = []",
                "var arr = {}",
                "var arr = new Array()",
                "Both A and C"
              ],
              "answer": "Both A and C",
              "points": 10
            },
            {
              "id": "js_e8",
              "question": "Which operator is used to compare both value and type in JavaScript?",
              "options": [
                "=",
                "==",
                "===",
                "!=="
              ],
              "answer": "===",
              "points": 10
            },
            {
              "id": "js_e9",
              "question": "How do you find the length of an array in JavaScript?",
              "options": [
                "array.length()",
                "array.length",
                "length(array)",
                "array.size()"
              ],
              "answer": "array.length",
              "points": 10
            },
            {
              "id": "js_e10",
              "question": "What will the following code output? console.log(1 + '1');",
              "options": [
                "2",
                "\"11\"",
                "\"2\"",
                "Error"
              ],
              "answer": "\"11\"",
              "points": 10
            },
            {
              "id": "js_e11",
              "question": "What is the output of 2 + '2'?",
              "options": [
                "4",
                "\"22\"",
                "\"4\"",
                "Error"
              ],
              "answer": "\"22\"",
              "points": 10
            },
            {
              "id": "js_e12",
              "question": "Which keyword is used to declare a variable in JavaScript?",
              "options": [
                "var",
                "let",
                "const",
                "All of the above"
              ],
              "answer": "All of the above",
              "points": 10
            },
            {
              "id": "js_e13",
              "question": "What is the default value of an uninitialized variable in JavaScript?",
              "options": [
                "undefined",
                "null",
                "0",
                "NaN"
              ],
              "answer": "undefined",
              "points": 10
            },
            {
              "id": "js_e14",
              "question": "Which operator is used to assign a value to a variable?",
              "options": [
                "=",
                "==",
                "===",
                "=>"
              ],
              "answer": "=",
              "points": 10
            },
            {
              "id": "js_e15",
              "question": "What does === mean in JavaScript?",
              "options": [
                "Assignment operator",
                "Equality without type conversion",
                "Equality with type conversion",
                "None of the above"
              ],
              "answer": "Equality without type conversion",
              "points": 10
            }
          ],
          "medium": [
            {
              "id": "js_m1",
              "question": "What is the output of [1, 2, 3].map(x => x * 2)?",
              "options": [
                "[1, 2, 3]",
                "[2, 4, 6]",
                "[1, 4, 9]",
                "Error"
              ],
              "answer": "[2, 4, 6]",
              "points": 20
            },
            {
              "id": "js_m2",
              "question": "How do you remove the last element from an array?",
              "options": [
                "array.pop()",
                "array.shift()",
                "array.splice(-1)",
                "array.remove()"
              ],
              "answer": "array.pop()",
              "points": 20
            },
            {
              "id": "js_m3",
              "question": "What does Array.prototype.filter() do?",
              "options": [
                "Modifies the array",
                "Creates a new array with elements that pass a test",
                "Reduces the array to a single value",
                "Sorts the array"
              ],
              "answer": "Creates a new array with elements that pass a test",
              "points": 20
            },
            {
              "id": "js_m4",
              "question": "How do you merge two arrays in JavaScript?",
              "options": [
                "array1.concat(array2)",
                "array1.join(array2)",
                "array1.add(array2)",
                "None of the above"
              ],
              "answer": "array1.concat(array2)",
              "points": 20
            },
            {
              "id": "js_m5",
              "question": "What is a higher-order function in JavaScript?",
              "options": [
                "A function that takes another function as an argument or returns a function",
                "A function that runs immediately",
                "A function declared globally",
                "None of the above"
              ],
              "answer": "A function that takes another function as an argument or returns a function",
              "points": 20
            },
            {
              "id": "js_m6",
              "question": "What is the default value of a function parameter in JavaScript?",
              "options": [
                "undefined",
                "null",
                "0",
                "Empty string"
              ],
              "answer": "undefined",
              "points": 20
            },
            {
              "id": "js_m7",
              "question": "What is the output of this code? function greet(name = 'Guest') { return `Hello, ${name}`; } console.log(greet());",
              "options": [
                "Hello, Guest",
                "Hello, undefined",
                "Hello, null",
                "Error"
              ],
              "answer": "Hello, Guest",
              "points": 20
            },
            {
              "id": "js_m8",
              "question": "What is the use of the apply() method?",
              "options": [
                "Calls a function with a specified this value and arguments as an array",
                "Creates a new function",
                "Immediately executes a function",
                "None of the above"
              ],
              "answer": "Calls a function with a specified this value and arguments as an array",
              "points": 20
            },
            {
              "id": "js_m9",
              "question": "What will the following code output? console.log(0.1 + 0.2 === 0.3);",
              "options": [
                "true",
                "false",
                "Error",
                "undefined"
              ],
              "answer": "false",
              "points": 20
            },
            {
              "id": "js_m10",
              "question": "How do you check if a variable is an array?",
              "options": [
                "Array.isArray(variable)",
                "variable instanceof Array",
                "typeof variable === 'array'",
                "Both A and B"
              ],
              "answer": "Both A and B",
              "points": 20
            },
            {
              "id": "js_m11",
              "question": "What will the following code output? console.log([2] == true);",
              "options": [
                "true",
                "false",
                "Error",
                "undefined"
              ],
              "answer": "false",
              "points": 20
            },
            {
              "id": "js_m12",
              "question": "What is the purpose of the bind() method in JavaScript?",
              "options": [
                "To create a new function with a specific this value",
                "To call a function with a specified this value",
                "To create a new object",
                "None of the above"
              ],
              "answer": "To create a new function with a specific this value",
              "points": 20
            },
            {
              "id": "js_m13",
              "question": "What is the output of the following code? console.log(typeof undefined);",
              "options": [
                "\"undefined\"",
                "\"null\"",
                "\"object\"",
                "\"number\""
              ],
              "answer": "\"undefined\"",
              "points": 20
            },
            {
              "id": "js_m14",
              "question": "What does the slice() method do in JavaScript?",
              "options": [
                "Removes elements from an array",
                "Returns a shallow copy of a portion of an array",
                "Sorts the elements of an array",
                "None of the above"
              ],
              "answer": "Returns a shallow copy of a portion of an array",
              "points": 20
            },
            {
              "id": "js_m15",
              "question": "What is the purpose of the setTimeout() function?",
              "options": [
                "To delay the execution of a function",
                "To execute a function repeatedly",
                "To stop the execution of a function",
                "None of the above"
              ],
              "answer": "To delay the execution of a function",
              "points": 20
            }
          ],
          "difficult": [
            {
              "id": "js_d1",
              "question": "What is a closure in JavaScript? How does it work?",
              "options": [
                "A function that can access variables in its own scope only",
                "A function that can access variables from its scope and parent scopes",
                "A function that executes immediately",
                "A block-scoped variable"
              ],
              "answer": "A function that can access variables from its scope and parent scopes",
              "points": 30
            },
            {
              "id": "js_d2",
              "question": "What will the following code output? function createCounter() { let count = 0; return function () { count++; return count; }; } const counter = createCounter(); console.log(counter()); console.log(counter());",
              "options": [
                "1, 1",
                "0, 0",
                "1, 2",
                "Error"
              ],
              "answer": "1, 2",
              "points": 30
            },
            {
              "id": "js_d3",
              "question": "What happens when you use a closure inside a loop with var instead of let? How can you fix it?",
              "options": [
                "The closure will use the same variable for all iterations",
                "The closure will create a new variable for each iteration",
                "The closure will throw an error",
                "None of the above"
              ],
              "answer": "The closure will use the same variable for all iterations",
              "points": 30
            },
            {
              "id": "js_d4",
              "question": "What is the difference between __proto__ and prototype in JavaScript?",
              "options": [
                "__proto__ is an object, prototype is a function",
                "__proto__ is used for inheritance, prototype is used for methods",
                "Both are the same",
                "None of the above"
              ],
              "answer": "__proto__ is used for inheritance, prototype is used for methods",
              "points": 30
            },
            {
              "id": "js_d5",
              "question": "What will the following code output? function Person(name) { this.name = name; } Person.prototype.greet = function () { return `Hello, ${this.name}`; }; const john = new Person('John'); console.log(john.greet());",
              "options": [
                "Hello, John",
                "Undefined",
                "Error",
                "Hello, undefined"
              ],
              "answer": "Hello, John",
              "points": 30
            },
            {
              "id": "js_d6",
              "question": "What will the following code output? async function test() { return 5; } console.log(test());",
              "options": [
                "5",
                "Promise { <pending> }",
                "Promise { 5 }",
                "Error"
              ],
              "answer": "Promise { 5 }",
              "points": 30
            },
            {
              "id": "js_d7",
              "question": "What is the output of the following code? console.log(0 == '0');",
              "options": [
                "true",
                "false",
                "Error",
                "undefined"
              ],
              "answer": "true",
              "points": 30
            },
            {
              "id": "js_d8",
              "question": "What is the purpose of the Promise object in JavaScript?",
              "options": [
                "To handle asynchronous operations",
                "To create new objects",
                "To manage events",
                "None of the above"
              ],
              "answer": "To handle asynchronous operations",
              "points": 30
            },
            {
              "id": "js_d9",
              "question": "What will the following code output? console.log(typeof NaN);",
              "options": [
                "\"number\"",
                "\"NaN\"",
                "\"undefined\"",
                "\"object\""
              ],
              "answer": "\"number\"",
              "points": 30
            },
            {
              "id": "js_d10",
              "question": "What is the output of the following code? console.log((function() { return typeof arguments; })());",
              "options": [
                "\"object\"",
                "\"array\"",
                "\"undefined\"",
                "\"arguments\""
              ],
              "answer": "\"object\"",
              "points": 30
            },
            {
              "id": "js_d11",
              "question": "What will the following code output? console.log(1 + '1');",
              "options": [
                "2",
                "\"11\"",
                "\"2\"",
                "Error"
              ],
              "answer": "\"11\"",
              "points": 30
            },
            {
              "id": "js_d12",
              "question": "What is the output of the following code? console.log([1, 2] == [1, 2]);",
              "options": [
                "true",
                "false",
                "Error",
                "undefined"
              ],
              "answer": "false",
              "points": 30
            },
            {
              "id": "js_d13",
              "question": "What will the following code output? console.log(1 === '1');",
              "options": [
                "true",
                "false",
                "Error",
                "undefined"
              ],
              "answer": "false",
              "points": 30
            },
            {
              "id": "js_d14",
              "question": "What is the output of the following code? console.log([2] == true);",
              "options": [
                "true",
                "false",
                "Error",
                "undefined"
              ],
              "answer": "false",
              "points": 30
            },
            {
              "id": "js_d15",
              "question": "What is the output of the following code? console.log(0.1 + 0.2 === 0.3);",
              "options": [
                "true",
                "false",
                "Error",
                "undefined"
              ],
              "answer": "false",
              "points": 30
            }
          ]
        }
      ;
  