// COMP2521 22T3 W1 lab with changes
// List.h - Interface to the List ADT

// Written by: Bianca Ren
// Date: 7th Nov 2022

#ifndef INTLIST_H
#define INTLIST_H

#include <stdbool.h>
#include <stdio.h>

#include "Graph.h"

// 4 characters are for '.txt'
#define MAX_URL_LENGTH 104

typedef struct IntListRep *List;

/**
 * Creates a new, empty List.
 */
List ListNew(void);

/**
 * Frees all memory associated with an List.
 */
void ListFree(List l);

/**
 * Creates an List by reading all the urls in a file
 * Assumes that the file is open for reading.
 */
List urlsInList(void);

/**
 * Appends an integer to an List.
 */
void ListAppend(List l, char urlName[MAX_URL_LENGTH]);

/**
 * Appends an integer to an List with all the information
 */
void ListAppendWithAllInfo(List l, char urlName[MAX_URL_LENGTH], 
						   int outDegree, double weightPR);

/**
 * Returns the number of elements in an List.
 */
int ListLength(List l);

/*
 * Returns the name of given node
 */
char *getUrlName(List l, int order);

/*
 * Returns the order of given node by comparing the name
 */
int getUrlNum(List l, char urlName[MAX_URL_LENGTH]);

/*
 * Show each url and its position in the list
 */
void listShow(List l);

/**
 * Sort the given list.
 * The list is in descending order by Weighted PageRank. 
 * Pages with the same Weighted PageRank should be 
 * sorted in increasing alphabetical order by URL.
 */
List sortList(List l);

/*
 * Go the that node with the given url, then update its
 * weight page rank
 */
void updateWeightedPR(char url[MAX_URL_LENGTH], List l,
                              double weightedPR);

/*
 * Go the that node with the given url, then update its outdegree
 */
void updateAllOutDegree(Graph directUrl, List l);


/*
 * Sorting (descending) for searchPageRank. It depends on the 
 * number of matching search terms, weighted pag rank, and 
 * alphabetical order by URL (in increasing order)
 */
List searchPRSort(List pageRankL, Graph invertedIndex);

/*
 * Show top 30 pages
 */
void searchPRShow(List sorted);

#endif

