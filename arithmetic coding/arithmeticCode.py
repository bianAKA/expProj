from tkinter import *
import re
import math

global errorButton
global errorButtonEx
global validInput
global sources
global buttonDe
global ans
global buttonEn
global probs
global passwd
global txt
global mesg
global answerExist
validInput = 0
errorButtonEx = False
answerExist = False

def toFloat(a):
    return float(a)

def validFloat(txt):
    pattern = re.compile(r'^[0-9]+\.[0-9]+')
    return bool(pattern.search(txt))

def subLtCheck(mesg, src):
    for symb in mesg:
        if symb not in src:
            return False

    return True

def noDup(l):
    for symb in l:
        if l.count(symb) > 1:
            return False

    return True

def delete(action):
    global buttonDe
    global buttonEn

    buttonEn.destroy()
    buttonDe.destroy()

    function = Label(text=action)
    function.place(relx=0.5, rely=0.0, anchor="center")
    function.config(padx=5, pady=5)

def interval():
    global sources
    global probs
    global txt

    x = 0
    txt = "scaled interval:    0  "
    scaledL = [0]
    for i in range(len(sources)):
        x += probs[i]
        txt += "%.5f" % (x)
        txt += "  "
        scaledL.append(x)

    return scaledL

def encodeCal(action):
    global sources
    global probs
    global mesg
    global txt
    global answerExist
    global ans

    delete(action)

    subIntStart = 0
    subIntWid = 1

    scaledL = interval()

    result = Label(text="Your result:")
    result.config(padx=5, pady=5)
    result.grid(row=6, column=2)

    data = Label(text=txt)
    data.config(padx=5, pady=5)
    data.grid(row=7, column=2)

    for symb in mesg:
        subIntStart = subIntStart + subIntWid * scaledL[sources.index(symb)]
        subIntWid = subIntWid * probs[sources.index(symb)]

    widthX = subIntStart
    widthY = subIntStart + subIntWid

    answer = "You may choose the number between %.5f and %.5f as your encoded message" % (widthX, widthY)
    if not answerExist:
        ans = Label(text=answer)
        ans.config(padx=5, pady=5)
        ans.grid(row=8, column=2)
        answerExist = True
    else:
        ans.config(text=answer)

    chose()

def decodeCal(action):
    global sources
    global answerExist
    global ans
    global passwd

    delete(action)
    scaledL = interval()

    result = Label(text="Your result:")
    result.config(padx=5, pady=5)
    result.grid(row=6, column=2)

    data = Label(text=txt)
    data.config(padx=5, pady=5)
    data.grid(row=7, column=2)

    decode = ""
    scaledNum = passwd[0]

    if len(scaledL) == 1:
        decode += sources[0]
    else:
        reachStop = False
        while not reachStop:
            for i in range(len(scaledL) - 1):
                if scaledL[i] <= scaledNum and scaledNum < scaledL[i+1]:
                    decode = decode + " " + sources[i]
                    if i == len(sources) - 1:
                        reachStop = True
                        break

                    scaledNum = (scaledNum - scaledL[i]) / (scaledL[i + 1] - scaledL[i])

    answer = "Your decoded message is %s" % (decode)
    if not answerExist:
        ans = Label(text=answer)
        ans.config(padx=5, pady=5)
        ans.grid(row=8, column=2)
        answerExist = True
    else:
        ans.config(text=answer)

    chose()

def chose():
    global buttonDe
    global buttonEn

    buttonDe = Button(text="encode", command=lambda: encodeCal("encode"))
    buttonDe.config(padx=5, pady=5)
    buttonDe.place(relx=0.0, rely=1.0, anchor=SW)

    buttonEn = Button(text="decode", command=lambda: decodeCal("decode"))
    buttonEn.config(padx=5, pady=5)
    buttonEn.place(relx=1.0, rely=1.0, anchor=SE)

def verify(inputS, inputP, messageP, passwordP):
    global validInput
    global errorButton
    global errorButtonEx
    global sources
    global probs
    global mesg
    global passwd

    sources = list(filter(None, inputS.get().split(' ')))
    prob = list(filter(None, inputP.get().split(' ')))
    message = list(filter(None, messageP.get().split(' ')))
    passwd = list(filter(None, passwordP.get().split(' ')))

    errorMess = ""

    if len(sources) != len(prob):
        errorMess = "error: invalid input where the number of sources and probabilities aren't equal"
    elif not noDup(sources):
        errorMess = "error: sources contain duplicates"
    elif len(list(filter(validFloat, prob))) != len(prob):
        errorMess = "error: some probability input are not floating number"
    elif math.ceil(sum(list(map(toFloat, prob)))) != 1:
        errorMess = "error: invalid probabilities, sum of probabilities should be equal to 1"
    elif len(message) == 0:
        errorMess = "error: please enter a message and make sure the symbols are from the sources set above"
    elif not subLtCheck(message, sources):
        errorMess = "error: invalid message, make sure that the sources you used for message is from the symbols you entered"
    elif message[-1] != sources[-1]:
        errorMess = "error: the last symbol in your message is not the stop symbol, which is the last symbol in your source set"
    elif len(passwd) != 1:
        errorMess = "error: please enter only one positive floating number for decoding process"
    elif not validFloat(passwd[0]):
        errorMess = "error: please enter a positive floating number for decoding process"
    elif toFloat(passwd[0]) > 1 or toFloat(passwd[0]) < 0:
        errorMess = "error: please enter the number between 0 and 1 inclusively for decoding process"

    if len(errorMess) == 0:
        validInput = 1
        errorMess = "valid input\n(If you want to encode/decode with different data, \nplease press finish before you click on encode/decode bottom)"
    else:
        errorMess += '\nPlease try it again'

    if not errorButtonEx:
        errorButton = Label(text=errorMess)
        errorButton.grid(row=5, column=2)
        errorButtonEx = True
    else:
        errorButton.config(text=errorMess)

    if errorMess == "valid input\n(If you want to encode/decode with different data, \nplease press finish before you click on encode/decode bottom)":
        probs = list(map(toFloat, prob))
        mesg = message
        passwd = list(map(toFloat, passwd))
        chose()

def getInfo():
    introS = Label(text="What are the sources:")
    introS.grid(row=1, column=1)
    introS.config(padx=5, pady=5)

    introP = Label(text="What are their probabilities:")
    introP.grid(row=2, column=1)
    introP.config(padx=5, pady=5)

    message = Label(text="what is your message:")
    message.grid(row=3, column=1)
    message.config(padx=5, pady=5)

    password = Label(text="What number do you want to decode:")
    password.grid(row=4, column=1)
    password.config(padx=5, pady=5)

    inputS = Entry(width=50)
    inputS.grid(row=1, column=2)

    inputP = Entry(width=50)
    inputP.grid(row=2, column=2)

    messageP = Entry(width=50)
    messageP.grid(row=3, column=2)

    passwordP = Entry(width=50)
    passwordP.grid(row=4, column=2)

    button = Button(text="finish", command=lambda: verify(inputS, inputP, messageP, passwordP))
    button.grid(row=2, column=4)
    button.config(pady=5, padx=5)

window = Tk()
window.title("Arithmetic Coding")
window.minsize(width=700, height=500)
window.config(padx=20, pady=20)

getInfo()

window.mainloop()