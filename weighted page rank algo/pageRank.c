// COMP2521 Assignment 2

// Written by: Bianca Ren (z5417107)
// Date: 7th Nov 2022

#include <assert.h>
#include <ctype.h>
#include <math.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Graph.h"
#include "List.h"

#define MAX_URL_LENGTH 104
typedef struct pageRankRep *PR;

const char *const txtFileExtent = ".txt";
const char *const start = "#start";
const char *const end = "#end";
const char *const section = "Section-1";

struct pageRankRep {
    double **weight;
    int numUrl;
    int numIter;
};

PR newPageRank(int urls, int iterations);
void PageRankFree(PR pr);
void weightPageRank(double d, double diffPR, int maxIterations, 
                    int numUrls, Graph directUrl, List allUrls, PR pr);
Graph linkUrl(List allUrls);
Graph doLinkUrl(Graph directUrl, char url[MAX_URL_LENGTH], 
                char urlFile[MAX_URL_LENGTH], List l);
bool isLinkable(Graph directUrl, char srcUrl[MAX_URL_LENGTH], 
                char destUrl[MAX_URL_LENGTH], List l);

int main(int argc, char *argv[]) {
    if (argc != 4) {
        fprintf(stderr, "Usage: %s dampingFactor diffPR maxIterations\n",
                argv[0]);
        return EXIT_FAILURE;
    }

    double d = atof(argv[1]);
    double diffPR = atof(argv[2]);
    int maxIterations = atoi(argv[3]);
    int numUrls;

    List allUrls = urlsInList();
    Graph directUrl = linkUrl(allUrls);
    updateAllOutDegree(directUrl, allUrls);

    numUrls = GraphNumVertices(directUrl);

    PR pr = newPageRank(numUrls, maxIterations);
    weightPageRank(d, diffPR, maxIterations, numUrls, directUrl, allUrls, pr);

    List sorted = sortList(allUrls);
    listShow(sorted);

    PageRankFree(pr);
    GraphFree(directUrl);
    ListFree(allUrls); 
    ListFree(sorted);

    return 0;
}

/*
 * Make a 2D array for recording every page rank value for each iteration
 * for each url. Every url's 0th iteration is setted as 1/number of iterations
 */
PR newPageRank(int urls, int iterations) {
    assert(urls != 0);
    assert(iterations != 0);

    PR pr = malloc(sizeof(*pr));
    if (pr == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    pr->numUrl = urls;
    pr->numIter = iterations;

    pr->weight = malloc(urls * sizeof(double *));
    if (pr->weight == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    double firstIterValue = 1.0 / (double) urls;

    for (int i = 0; i < urls; i++) {
        pr->weight[i] = calloc(iterations, sizeof(double));
        if (pr->weight[i] == NULL) {
            fprintf(stderr, "error: out of memory\n");
            exit(EXIT_FAILURE);
        }

        pr->weight[i][0] = firstIterValue;
    }

    return pr;
}

/*
 * Free whole page rank struct.
 */
void PageRankFree(PR pr) {
    for (int i = 0; i < pr->numUrl; i++) {
        free(pr->weight[i]);
    }

    free(pr->weight);
    free(pr);
}

/*
 * It calculates the probability that the user is randomly clicked into a URL
 */
static double probability(double d, int N) {
    return (1 - d) / N;
}

/*
 * It counts the number of inlinks from the given url
 */
static int numOfInLinks(Graph directUrl, int currUrl) {
    int numInL = 0;
    for (int parent = 0; parent < GraphNumVertices(directUrl); parent++) {
        if (edgeValue(directUrl, parent, currUrl) && parent != currUrl) {
            numInL++;
        }
    }

    return numInL;
}

/*
 * It calculates the inlink weight of link(j, i) 
 */
static double inLinksWeight(Graph directUrl, int urlJ, int urlI) {
    double numerator = (double) numOfInLinks(directUrl, urlI);
    double denominator = 0;

    int outLink;
    for (outLink = 0; outLink < GraphNumVertices(directUrl); outLink++) {
        if (edgeValue(directUrl, urlJ, outLink)) {
            denominator += numOfInLinks(directUrl, outLink);
        }
    }

    return numerator / denominator;
}

/*
 * It calculates the outlink weight of link(j, i)
 */
static double outLinksWeight(Graph directUrl, int urlJ, int urlI) {
    double numerator = numOfOutLinks(directUrl, urlI);
    double denominator = 0.0;
    int outLink, totalOutL;

    if (numerator == 0.0) {
        numerator = 0.5;
    }

    for (outLink = 0; outLink < GraphNumVertices(directUrl); outLink++) {
        if (edgeValue(directUrl, urlJ, outLink)) {
            totalOutL = numOfOutLinks(directUrl, outLink);
            if (totalOutL == 0) {
                denominator += 0.5;
            } else {
                denominator += (double) totalOutL;
            }

        }
    }

    return numerator / denominator;
}
  
/*
 * Given url is already a parent link or not. If no then return true,
 * otherwise return false.
 */
static bool isNew(int parentLinks[], int size, int preparedParentL) {
    for (int i = 0; i < size; i++) {
        if (parentLinks[i] == preparedParentL) {
            return false;
        }
    }

    return true;
}

/*
 * Calculate the number of valid links (value != -1) inside the given array
 */
static int numParentL(int parentLinks[], int size) {
    int num = 0;
    for (int i = 0; i < size; i++) {
        if (parentLinks[i] != -1) {
            num++;
        }
    }

    return num;
}

/*
 * Get array of links to the current Url. 
 * During the process, we remove those self links and those parallel edges
 */
static int *parentLinks(Graph directUrl, int currIter) {
    int i;
    int numLinks = GraphNumVertices(directUrl); 
    int *links = malloc(sizeof(int) * numLinks);

    for (i = 0; i < numLinks; i++) {
        links[i] = -1;
    }

    int numParent = 0;
    for (i = 0; i < numLinks; i++) {
        // avoid self links
        if (i == currIter) {
            continue;
        }

        if (
            edgeValue(directUrl, i, currIter)
            && isNew(links, numLinks, i)
        ) {
            links[numParent++] = i;
        }
    }

    return links;
}

/*
 * Calculate the pageRank for a iteration with two given urls
 */
static double calculatePageRank(double d, int N, PR pr, int urlI, int currIter,
                                Graph directUrl, int prevIter) {
    int i;
    double product;
    double sum = 0.0;
    double prob = probability(d, N);
    int *linkJs = parentLinks(directUrl, urlI);
    int sizeJs = numParentL(linkJs, GraphNumVertices(directUrl));

    for (i = 0; i < sizeJs; i++) {
        product = 1.0;

        product *= pr->weight[linkJs[i]][prevIter];
        product *= inLinksWeight(directUrl, linkJs[i], urlI);
        product *= outLinksWeight(directUrl, linkJs[i], urlI);

        sum += product;
    }

    free(linkJs);

    return (prob + d * sum);
}

/*
 * Calculate the sum of differences between the given url's last iteration 
 * page rank and previous iteration and current iteration
 */
static double calculateDiff(PR pr, int prevIter, int currIter, 
                            int urlI) {
    double diff = 0.0;
    int url;

    for (url = 0; url < pr->numUrl; url++) {
        diff += fabs(pr->weight[url][currIter] - pr->weight[url][prevIter]);
    }

    return diff;
}

/*
 * Calculate the weighted page rank with the given values and algorithm
 */
void weightPageRank(double d, double diffPR, int maxIterations, 
                    int numUrls, Graph directUrl, List allUrls, PR pr) {
    double diff = diffPR;
    int iter, prevIter, currIter, urlI;

    for (iter = 0; iter < maxIterations - 1 && diff >= diffPR; iter++) {
        prevIter = iter;
        currIter = iter + 1;

        for (urlI = 0; urlI < numUrls; urlI++) {
            pr->weight[urlI][currIter] = calculatePageRank(d, numUrls, pr, urlI, 
                                                   currIter, directUrl, 
                                                   prevIter);

            updateWeightedPR(getUrlName(allUrls, urlI), allUrls,
                                        pr->weight[urlI][currIter]);         
        }

        diff = calculateDiff(pr, prevIter, currIter, urlI);
    }
}

/*
 * Put the links between each pair of urls into a adjacency matrix
 * then return it
 */
Graph linkUrl(List allUrls) {
    int numUrl = ListLength(allUrls);
    Graph directUrl = GraphNew(numUrl, numUrl);
    char *urlFile = malloc(sizeof(char) * MAX_URL_LENGTH);
    char *url = malloc(sizeof(char) * MAX_URL_LENGTH);
    int i;

    for (i = 0; i < numUrl; i++) {
        strcpy(url, getUrlName(allUrls, i));
        strcpy(urlFile, url);
        strcat(urlFile, txtFileExtent);

        directUrl = doLinkUrl(directUrl, url, urlFile, allUrls);
    }

    free(url);
    free(urlFile);

    return directUrl;
}

/*
 * Process of put the relation between url links into the graph
 */
Graph doLinkUrl(Graph directUrl, char url[MAX_URL_LENGTH], 
                char urlFile[MAX_URL_LENGTH], List l) {
    FILE *fp = fopen(urlFile, "r");
    if (fp == NULL) {
		fprintf(stderr, "Can't open %s\n", urlFile);
		exit(EXIT_FAILURE);
	}
    
    char *nextUrl = malloc(sizeof(char) * MAX_URL_LENGTH);

    while (fscanf(fp, "%s ", nextUrl) == 1) {
        if (strcmp(end, nextUrl) == 0) {
            break;
        } else if (!isLinkable(directUrl, url, nextUrl, l)) {
            continue;
        } 
      
        GraphInsertEdge(directUrl, getUrlNum(l, url), getUrlNum(l, nextUrl));
    }

    fclose(fp);
    free(nextUrl);

    return directUrl;
}

/*
 * Return true if the url can be linked, otherwise reutrn fasle
 * eliminate url string id not url snd self links
 */
bool isLinkable(Graph directUrl, char srcUrl[MAX_URL_LENGTH], 
                char destUrl[MAX_URL_LENGTH], List l) {
    if (
        strcmp(start, destUrl) == 0 || 
        strcmp(section, destUrl) == 0 ||
        strcmp(srcUrl, destUrl) == 0 || 
        GraphIsAdjacent(directUrl, getUrlNum(l, srcUrl), getUrlNum(l, destUrl))
    ) {
        return false;
    }

    return true;
}