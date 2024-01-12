"""
This agent invokes the DFS method to find a route to the goal.
Each call to do_step advances the agent to the next state in the path.
Rest and start_agent are called from the main loop.

Author: Armin Chitizadeh, Claude Sammut
"""

from agent import *
import dfs, agent

class DFSAgent(Agent):

    def reset(self):
        # Find the goal
        self.goal = None
        for i, t in enumerate(self.gw.tiles):
            if t == gridworld.TILE_GOAL:
                self.goal = i

        if not self.goal:
            raise Exception("No goal set - can't start search")

        Agent.reset(self)

    def start_agent(self):
        Agent.start_agent(self)
        self.start = self.state
        self.step = 0

        self.path = dfs.find_path(self.gw.immtileneighbours,
                                  self.start,
                                  self.goal,
                                  [],
                                  lambda tile: not self.gw.tileblocked(*self.gw.indextopos(tile)))
        print(self.path)

    def do_step(self, S, act, logfile=None):
        if not self.path:
            self.step = agent.TIMEOUT + 1
            return

        self.state = self.path[self.step]
        self.step += 1

        self.G += 1
        return 0 if self.state == gridworld.TILE_GOAL else -1, self.state


class IdDfsAgent(Agent):
    def reset(self):
        # Find the goal
        self.goal = None
        for i, t in enumerate(self.gw.tiles):
            if t == gridworld.TILE_GOAL:
                self.goal = i

        if not self.goal:
            raise Exception("No goal set - can't start search")

        Agent.reset(self)

    # return a list with ONLY two boolen values
    # first one represents if the goal is reached or not
    # second one determines if the function can do the search with deeper bound or not
    def depthLimitSearch(self, curr, distToBound):
        reachable = lambda tile: not self.gw.tileblocked(*self.gw.indextopos(tile))

        if distToBound == 0:
            if curr == self.goal:
                self.path = [curr] + self.path
                return [True, True]
            else:
                return [False, True]
        elif distToBound > 0:
            canContinue = False
            
            if reachable(curr):
                for successor in self.gw.immtileneighbours(curr):
                    foundAndContinued = self.depthLimitSearch(successor, distToBound - 1)
                    if foundAndContinued[0]:
                        self.path = [curr] + self.path
                        return [True, True]
                    if foundAndContinued[1]:
                        canContinue = True

            return [False, canContinue]
            
    # Rerence to pseudocode:
    # https://en.wikipedia.org/wiki/Iterative_deepening_depth-first_search#:~:text=In%20computer%20science%2C%20iterative%20deepening,until%20the%20goal%20is%20found.
    def IDDfs(self):
        reachable = lambda tile: not self.gw.tileblocked(*self.gw.indextopos(tile))
        if not reachable(self.start):
            return

        boundLevel = 0
        while boundLevel <= 10000:
            foundAndContinued = self.depthLimitSearch(self.start, boundLevel)
            if foundAndContinued[0]:
                return
            elif not foundAndContinued[1]:
                return
            
            boundLevel += 1

    def start_agent(self):
        Agent.start_agent(self)
        self.start = self.state
        self.step = 0

        self.path = []
        
        self.IDDfs()

        print(self.path)


    def do_step(self, S, act, logfile=None):
        if not self.path:
            self.step = agent.TIMEOUT + 1
            return

        self.state = self.path[self.step]
        self.step += 1

        self.G += 1
        return 0 if self.state == gridworld.TILE_GOAL else -1, self.state


