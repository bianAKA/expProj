// COMP2521 22T3 W1 lab witg changes
// List.c - Implementation of the List ADT

// Written by: Bianca Ren
// Date: 7th Nov 2022

#include <assert.h>
#include <err.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <sysexits.h>
#include <string.h>

#include "List.h"

// data structures representing List
typedef struct node *Node;

struct node {
	char url[MAX_URL_LENGTH];
	double weightedPR;
	int outDegree;

	Node next;  
};

struct IntListRep {
	int size;            
	Node first;          
};

static Node newListNode(char urlName[MAX_URL_LENGTH], 
                        double weightedPR, int outDegree);
/* 
 * Return true if given url are equal, otherwise return false
 */
static bool areSame(char url1[MAX_URL_LENGTH], char url2[MAX_URL_LENGTH]) {
	return strcmp(url1, url2) == 0;
}

List ListNew(void) {
	List l = malloc(sizeof(*l));
	if (l == NULL) {
		err(EX_OSERR, "couldn't allocate List");
	}

	l->size = 0;
	l->first = NULL;

	return l;
}

void ListFree(List l) {
	Node curr = l->first;
	while (curr != NULL) {
		Node temp = curr;
		curr = curr->next;
		free(temp);
	}

	free(l);
}

List urlsInList(void) {
	List allUrls = ListNew();
	char *urlName = malloc(sizeof(char) * MAX_URL_LENGTH);

	FILE *fp = fopen("./collection.txt", "r");
	if (fp == NULL) {
		fprintf(stderr, "Can't open ./collection.txt\n");
		exit(EXIT_FAILURE);
	}
	
	while (fscanf(fp, "%s ", urlName) == 1) {
		ListAppend(allUrls, urlName);
    }

	fclose(fp);
	free(urlName);

	return allUrls;
}

static Node appending(Node n, char urlName[MAX_URL_LENGTH]) {
	if (n == NULL) {
		return newListNode(urlName, 0, 0.0);
    } 

    n->next = appending(n->next, urlName);
    return n;
}

void ListAppend(List l, char urlName[MAX_URL_LENGTH]) {
	l->first = appending(l->first, urlName);
	l->size++;
}

static Node appendingWithAllInfo(Node n, char urlName[MAX_URL_LENGTH],
							     int outDegree, double weightPR) {
	if (n == NULL) {
		return newListNode(urlName, weightPR, outDegree);
    } 

    n->next = appendingWithAllInfo(n->next, urlName, outDegree, weightPR);
    return n;
}

void ListAppendWithAllInfo(List l, char urlName[MAX_URL_LENGTH], 
						   int outDegree, double weightPR) {
	l->first = appendingWithAllInfo(l->first, urlName, outDegree, weightPR);
	l->size++;
}

static Node newListNode(char urlName[MAX_URL_LENGTH], 
                        double weightedPR, int outDegree) {
	Node n = malloc(sizeof(*n));
	if (n == NULL) {
		err(EX_OSERR, "couldn't allocate List node");
	}
    
	strcpy(n->url, urlName);
	n->weightedPR = weightedPR;
	n->outDegree = outDegree;
	n->next = NULL;

	return n;
}

int ListLength(List l) {
	return l->size;
}

char *getUrlName(List l, int order) {
	Node n = l->first;
	int i;

	for (i = 0; i < order; i++) {
		n = n->next;
	}

	return n->url;
}

int getUrlNum(List l, char urlName[MAX_URL_LENGTH]) {
	Node n = l->first;

	int i;
	for (i = 0; i < ListLength(l); i++) {
		if (areSame(n->url, urlName)) {
			break;
		}

		n = n->next;
	}

	return i;
}

void listShow(List l) {
	for (Node curr = l->first; curr != NULL; curr = curr->next) {
		printf("%s %d %.7lf\n", curr->url, curr->outDegree, curr->weightedPR);
	}

}

void updateWeightedPR(char url[MAX_URL_LENGTH], List l,
                                  double weightedPR) {
	for (Node curr = l->first; curr != NULL; curr = curr->next) {
		if (areSame(url, curr->url)) {
			curr->weightedPR = weightedPR;
			return;
		}
	}
}

void updateAllOutDegree(Graph directUrl, List l) {
	int i = 0;
	for (Node curr = l->first; curr != NULL; curr = curr->next) {
		curr->outDegree = numOfOutLinks(directUrl, i++);
	}
}

/*
 * Compare the weighted page rank and url name. 
 * Return true if n1 > n2, otherwise return false
 */
bool canInsert(Node n1, Node n2) {
	if (n1->weightedPR > n2->weightedPR) {
		return true;
	} else if (n1->weightedPR < n2->weightedPR) {
		return false;
	}

	return strcmp(n1->url, n2->url) < 0;
}

/*
 * Main process of sorting the given list in descending order by weighted page rank
*/
void doSortList(List sortedList, char url[MAX_URL_LENGTH], 
				double weightedPR, int numOutL) {
	Node newNode = newListNode(url, weightedPR, numOutL);
	sortedList->size++;

	if (sortedList->first == NULL) {
		sortedList->first = newNode;
		return;
	} else if (canInsert(newNode, sortedList->first)) {
		newNode->next = sortedList->first;
		sortedList->first = newNode;

		return;
	} 

	for (Node curr = sortedList->first; curr != NULL; curr = curr->next) {
		if (curr->next == NULL && canInsert(curr, newNode)) {
			curr->next = newNode;
		} else if (
			canInsert(curr, newNode) && 
			canInsert(newNode, curr->next) && 
			curr->next != NULL
		) {
			newNode->next = curr->next;
			curr->next = newNode;

			return;
		}
	}
}

List sortList(List l) {
	List sortedList = ListNew();

	for (Node curr = l->first; curr != NULL; curr = curr->next) {
		doSortList(sortedList, curr->url, curr->weightedPR, curr->outDegree);
	}

	return sortedList;
}

/*
 * Compare the number of matches, weighted page rank and urlname
 * return true if it can be inserted
 */
bool insert(Node n1, Node n2, Graph invertedIndex, List originalL) {
	int num1 = numMatchingTerms(invertedIndex, getUrlNum(originalL, n1->url));
	int num2 = numMatchingTerms(invertedIndex, getUrlNum(originalL, n2->url));
	
	if (num1 > num2) {
		return true;
	} else if (num1 < num2) {
		return false;
	}

	if (n1->weightedPR > n2->weightedPR) {
		return true;
	} else if (n1->weightedPR < n2->weightedPR) {
		return false;
	}

	return strcmp(n1->url, n2->url) < 0;
}

/*
 * Main process of sorting the given list in descending order. 
 */
void doSearchPRSort(List sortL, Node curr, 
                    Graph invertedIndex, List originalL) {
	if (numMatchingTerms(invertedIndex, getUrlNum(originalL, curr->url)) == 0) {
		return;
	}

	Node newNode = newListNode(curr->url, curr->weightedPR, curr->outDegree);
	sortL->size++;

	if (sortL->first == NULL) {
		sortL->first = newNode;
	} else if (insert(newNode, sortL->first, invertedIndex, originalL)) {
		newNode->next = sortL->first;
		sortL->first = newNode;
	} else {
		for (Node temp = sortL->first; temp != NULL; temp = temp->next) {
			if (
				temp->next == NULL && 
				insert(temp, newNode, invertedIndex, originalL)
			) {
				temp->next = newNode;
				break;
			} else if (temp->next != NULL) {
				bool result1 = insert(temp, newNode, invertedIndex, originalL);
				bool result2 = insert(newNode, temp->next, invertedIndex, originalL);
				
				if (result1 && result2) {
					newNode->next = temp->next;
					temp->next = newNode;
				}
			}
		}
	}
}

List searchPRSort(List pageRankL, Graph invertedIndex) {
	List sortedList = ListNew();

	for (Node curr = pageRankL->first; curr != NULL; curr = curr->next) {
		doSearchPRSort(sortedList, curr, invertedIndex, pageRankL);
	}

	return sortedList;
}

void searchPRShow(List sorted) {
	int i = 0;
	for (Node curr = sorted->first; curr != NULL; curr = curr->next) {
		printf("%s\n", curr->url);
		
		if (i++ == 29) {
			break;
		}
	}
}