def push(elem, s):
	return s + [elem]

def pop(s):
	return s[:-1]

def numElem(s):
	num = 0
	for elem in s:
		num += 1
	
	return num

def position(elem, index):
	i = 0
	for node in index:
		if node == elem:
			break
		i += 1

	return i

def level(elem, index, predecessor):
	i = position(elem, index)
	l = 0
	while predecessor[i] != -1:
		i = predecessor[i]
		l += 1

	return l

def find_path(neighbour_fn,
			  start,
			  goal,
			  visited,
			  reachable = lambda pos: True,
			  depth = 100000):
	#The reachable function returns true if the given node is not blocked by a wall.

	if start == goal:
		return [goal]

	if not reachable(start):
		return []

	stack = []
	visited = []
	isFound = False

	indexL = [start]
	predecessorL = [-1]
	
	stack += [start]
	while numElem(stack) != 0:
		curr = stack[-1]
		stack = pop(stack)

		if curr == goal:
			isFound = True
			break
		
		if curr not in visited:
			visited += [curr]

			if level(curr, indexL, predecessorL) <= depth:
				for child in neighbour_fn(curr):
					if reachable(child) and (child not in visited):
						stack = push(child, stack)
						indexL += [child]
						predecessorL += [position(curr, indexL)]

	if isFound:
		currIndex = position(goal, indexL)
		path = []
		while currIndex != -1:
			path = [indexL[currIndex]] + path
			currIndex = predecessorL[currIndex]
		
		return path
	else:
		return []
