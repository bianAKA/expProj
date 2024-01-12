// COMP2521 Assignment 2

// Written by: Bianca Ren (z5417107)
// Date: 2022 13rd Nov 

#include <assert.h>
#include <ctype.h>
#include <math.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "List.h"
#include "Graph.h"

#define MAX_URL_LENGTH 104
#define MAX_LENGTH 1000

List getPageInfo(void);
void getInvertedIndex(Graph invertedIndex, int argC, char *argV[], List l);

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s no sufficient amount of inputs\n",
                argv[0]);
        return EXIT_FAILURE;
    }

    List pageRankL = getPageInfo();
    Graph invertedIndex = GraphNew(argc - 1, ListLength(pageRankL));

    getInvertedIndex(invertedIndex, argc, argv, pageRankL);

    List sorted = searchPRSort(pageRankL, invertedIndex);
    searchPRShow(sorted);

    GraphFree(invertedIndex);
    ListFree(pageRankL);
    ListFree(sorted);
    
    return 0;
}

/**
 * Transfer the url that contains the matched term into invertedIndex table
 */
void getInvertedIndex(Graph invertedIndex, int argC, char *argV[], List l) {
    char *term = malloc(sizeof(char) * MAX_LENGTH);
    char *url = malloc(sizeof(char) * MAX_URL_LENGTH);

    for (int i = 1; i < argC; i++) {
        FILE *fp = fopen("./invertedIndex.txt", "r");
        if (fp == NULL) {
            fprintf(stderr, "Can't open ./invertedIndex.txt\n");
            exit(EXIT_FAILURE);
        }
        
        while (fscanf(fp, "%s ", term) == 1) {
            if (strcmp(term, argV[i]) != 0) {
                continue;
            }

            while (fscanf(fp, "%s ", url) == 1) {
                // the string is the url
                if (getUrlNum(l, url) < ListLength(l)) {
                    GraphInsertEdge(invertedIndex, i - 1, getUrlNum(l, url));
                } else {
                    break;
                }
            }
        }

        fclose(fp);
    }

    free(term);
    free(url);
}

/**
 * Open pageRankList.txt and store those data for each url into a node
 * then link those nodes together to become a linked list
 */
List getPageInfo(void) {
    List l = ListNew();
    char *url = malloc(sizeof(char) * MAX_URL_LENGTH);
    int outDegree = 0;
    double weightPR = 0.0;

    FILE *fp = fopen("./pageRankList.txt", "r");
    if (fp == NULL) {
		fprintf(stderr, "Can't open ./pageRankList.txt\n");
		exit(EXIT_FAILURE);
	}

    while (fscanf(fp, "%s %d %lf", url, &outDegree, &weightPR) == 3) {
        ListAppendWithAllInfo(l, url, outDegree, weightPR);
    }

    fclose(fp);
    free(url);

    return l;
}
