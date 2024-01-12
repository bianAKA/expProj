from turtle import Turtle, Screen

screen = Screen()
screen.bgcolor("black")

class ScoreBoard(Turtle):
    def __init__(self):
        super().__init__()
        self.score = 0
        self.penup()
        self.goto(0, 250)
        self.hideturtle()
        self.color("white")

        with open("data.txt") as data:
            self.high_score = int(data.read())

    def plus(self):
        self.score += 1

    def scoring(self):
        self.clear()
        self.write(f"Score: {self.score} High Score: {self.high_score}", align = "center", font = ("Arial", 14, "normal"))

    def reset(self):
        if self.score > self.high_score:
            self.high_score = self.score
            with open("data.txt", mode = "w") as data:
                data.write(f"{self.score}")

        self.score = 0
        self.scoring()


