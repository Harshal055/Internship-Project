export const pythonQuestions = {
    "easy": [
       
          {
            "id": "py_e1",
            "question": "What is the correct syntax to output 'Hello World' in Python?",
            "options": [
              "print('Hello World')",
              "echo('Hello World')",
              "System.out.println('Hello World')",
              "console.log('Hello World')"
            ],
            "answer": "print('Hello World')",
            "points": 10
          },
          {
            "id": "py_e2",
            "question": "Which of the following is a valid variable declaration in Python?",
            "options": [
              "1name = 'John'",
              "name = 'John'",
              "name-1 = 'John'",
              "var name = 'John'"
            ],
            "answer": "name = 'John'",
            "points": 10
          },
          {
            "id": "py_e3",
            "question": "Which of the following is not a Python data type?",
            "options": [
              "List",
              "Tuple",
              "Dictionary",
              "Character"
            ],
            "answer": "Character",
            "points": 10
          },
          {
            "id": "py_e4",
            "question": "What is the output of the following code? print(type([]))",
            "options": [
              "<class 'list'>",
              "<class 'dict'>",
              "<class 'tuple'>",
              "<class 'set'>"
            ],
            "answer": "<class 'list'>",
            "points": 10
          },
          {
            "id": "py_e5",
            "question": "What is the output of the following code? print(3 * 'abc')",
            "options": [
              "'abcabcabc'",
              "'abcabc'",
              "'abc'",
              "Error"
            ],
            "answer": "'abcabcabc'",
            "points": 10
          }
        ],
        "medium": [
          {
            "id": "py_m1",
            "question": "What is the output of the following code? print(0.1 + 0.2 == 0.3)",
            "options": [
              "True",
              "False",
              "Error",
              "None"
            ],
            "answer": "False",
            "points": 20
          },
          {
            "id": "py_m2",
            "question": "What is the output of the following code? print([1, 2, 3].map(lambda x: x * 2))",
            "options": [
              "[1, 2, 3]",
              "[2, 4, 6]",
              "[1, 4, 9]",
              "Error"
            ],
            "answer": "Error",
            "points": 20
          },
          {
            "id": "py_m3",
            "question": "What is the output of the following code? print(1 == '1')",
            "options": [
              "True",
              "False",
              "Error",
              "None"
            ],
            "answer": "False",
            "points": 20
          },
          {
            "id": "py_m4",
            "question": "What is the output of the following code? print(1 + 2 + '3')",
            "options": [
              "'123'",
              "'12'",
              "'6'",
              "Error"
            ],
            "answer": "Error",
            "points": 20
          },
          {
            "id": "py_m5",
            "question": "What is the output of the following code? print(2 ** 3)",
            "options": [
              "6",
              "8",
              "Error",
              "None"
            ],
            "answer": "8",
            "points": 20
          }
        ],
        "difficult": [
          {
            "id": "py_d1",
            "question": "What is a closure in Python? How does it work?",
            "options": [
              "A function that can access variables in its own scope only",
              "A function that can access variables from its scope and parent scopes",
              "A function that executes immediately",
              "A block-scoped variable"
            ],
            "answer": "A function that can access variables from its scope and parent scopes",
            "points": 30
          },
          
        ]
}
