// COMP2521 Assignment 2

// Written by: Bianca Ren(z5417107)
// Date: 2022 13rd Nov 

#include <assert.h>
#include <ctype.h>
#include <math.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_URL_LENGTH 104

typedef int *Permutation;
typedef struct setUrl *Set;
typedef struct urlInsideSet *Url;
typedef struct allSetUrls *AllSets;
typedef struct scaledDist *Footrule;
typedef struct smallestFootruleScale *Shortest;

struct allSetUrls {
    int numSet;
    Set setHead;
};

struct setUrl {
    Url urlFirst;
    Set nextSetH;
    int numUrls;
};

struct urlInsideSet {
    Url next;
    int position;
    char url[MAX_URL_LENGTH];
};

struct smallestFootruleScale {
    int *p;
    int permutaitonSize;
    double value;
};

struct scaledDist {
    double **wTable;
    int row;        // number of urls in set C
    int col;        // number of sources/sets in allSetUrls struct
};

int factorial(int n); 
void printSet(Set s);
void swap(int *x, int *y);
void freeAll(AllSets sets);
void freeSet(Set tempSet);
void printAll(AllSets allS);
void freeDist(Shortest footRule);
void printMinDist(Shortest dist, Set C);
void freeDistT(Footrule distTable);
Set creatSet(void);
Set SetUnion(AllSets allS);
Permutation newPerm(Set C);
AllSets SetNew(int argC, char *argV[]);
Footrule toRecordDistance(int row, int col);
Shortest makeFootrule(int size);
Shortest updateInfo(Shortest curr, int position[], double dist);
Url createUrl(char url[MAX_URL_LENGTH], int position);
double getDist(AllSets allS, Set C, Permutation perm, Footrule distTable);

int main(int argc, char *argv[]) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s no sufficient amount of inputs\n",
                argv[0]);
        return EXIT_FAILURE;
    }

    double dist;

    AllSets allS = SetNew(argc, argv);
    Set C = SetUnion(allS);
    Shortest minFootRule = makeFootrule(C->numUrls);    
    Footrule distanceTable = toRecordDistance(C->numUrls, allS->numSet);
    Permutation pList = newPerm(C);

    dist = getDist(allS, C, pList, distanceTable);
    minFootRule = updateInfo(minFootRule, pList, dist);

    // generating permutation is from
    // https://stackoverflow.com/questions/71652916/iterative-permute-function-in-c
    // with some changes to make it capable with the functionality of 
    // this function
    int j = 0;
    int f = factorial(C->numUrls);
    int *arr = calloc(f, sizeof(int));

    while (j < C->numUrls) {
        if (arr[j] < j) {
            if (j % 2 == 0) {
                swap(pList + 0, pList + j);
            } else {
                swap(pList + arr[j], pList + j);
            }

            dist = getDist(allS, C, pList, distanceTable);
            minFootRule = updateInfo(minFootRule, pList, dist);

            arr[j]++;
            j = 0;
        } else {
            arr[j] = 0;
            j++;
        }
    }

    printMinDist(minFootRule, C);

    free(arr);
    freeSet(C);
    free(pList);
    freeAll(allS);
    freeDist(minFootRule);
    freeDistT(distanceTable);

    return 0;
}

/*
 * Sum up all the value then return it
 */
double sum(Footrule distTable) {
    double sumDist = 0.0;
    for (int i = 0; i < distTable->row; i++) {
        for (int j = 0; j < distTable->col; j++) {
            sumDist += distTable->wTable[i][j];
        }
    }

    return sumDist;
}

/*
 * get the magnitude of that set
 */
int getSizeT(AllSets allS, int set) {
    int i = 0;
    Set s;
    for (s = allS->setHead; s != NULL; s = s->nextSetH) {
        if (i == set) {
            break;
        }

        i++;
    }

    return s->numUrls;
}

/*
 * get the position of c in the given ranking (set)
 */
int getT(AllSets allS, char url[MAX_URL_LENGTH], int set) {
    int i = 0;
    for (Set s = allS->setHead; s != NULL; s = s->nextSetH) {
        if (i == set) {
            for (Url u = s->urlFirst; u != NULL; u = u->next) {
                if (strcmp(u->url, url) == 0) {
                    return u->position;
                }
            }
            
            break;
        }

        i++;
    }

    //the urlname is not in the set
    return 0;
}

/*
 * Use the given information to calculate the scaled footrule distance of
 * the given permutation
 */
double getDist(AllSets allS, Set C, Permutation perm, Footrule distTable) {
    int set, position; 
    double t, sizeT, p;
    double n = (double) C->numUrls;

    for (set = 0; set < allS->numSet; set++) {
        Url c = C->urlFirst;
        for (position = 0; position < C->numUrls; position++) {
            sizeT = (double) getSizeT(allS, set); 
            t = getT(allS, c->url, set);
            p = t == 0 ? 0 : perm[position];

            distTable->wTable[position][set] = fabs(t / sizeT - p / n);
            c = c->next;
        }
    }

    return sum(distTable);
}

/*
 * Initialise the first permutation result to become the original
 * position in set C
 */
Permutation newPerm(Set C) {
    Permutation new = malloc(sizeof(int) * C->numUrls);
    if (new == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    int i = 0;
    for (Url curr = C->urlFirst; curr != NULL; curr = curr->next) {
        new[i++] = curr->position;
    }
    
    return new;
}

/*
 * Create a table (2D array) to record the value.
 */
Footrule toRecordDistance(int row, int col) {
    Footrule new = malloc(sizeof(*new));
    if (new == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    new->row = row;
    new->col = col;

    new->wTable = malloc(sizeof(double *) * row);
    if (new->wTable == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    for (int i = 0; i < row; i++) {
        new->wTable[i] = calloc(col, sizeof(double));
        if (new->wTable[i] == NULL) {
            fprintf(stderr, "error: out of memory\n");
            exit(EXIT_FAILURE);
        }
    }

    return new;
}

/*
 * Free the table
 */
void freeDistT(Footrule distTable) {
    for (int i = 0; i < distTable->row; i++) {
        free(distTable->wTable[i]);
    }

    free(distTable->wTable);
    free(distTable);
}

/*
 * Print the result of the url list that has the 
 * minimum scaled foot rule distance
 */
void printMinDist(Shortest dist, Set C) {
    printf("%.7lf\n", dist->value);

    int i;
    char **printOrder = malloc(sizeof(char *) * C->numUrls);

    for (i = 0; i < C->numUrls; i++) {
       printOrder[i] = malloc((sizeof(char) * MAX_URL_LENGTH)); 
    }   

    Url u = C->urlFirst;    
    for (i = 0; i < dist->permutaitonSize; i++) {
        strcpy(printOrder[dist->p[i] - 1], u->url);
        u = u->next;
    }

    for (i = 0; i < dist->permutaitonSize; i++) {
        printf("%s\n", printOrder[i]);
    }

    for (i = 0; i < C->numUrls; i++) {
       free(printOrder[i]);
    }  

    free(printOrder);  
}

/*
 * If the given distance is the smallest, the update the distance and 
 * positions in the struct
 */
Shortest updateInfo(Shortest curr, int position[], double dist) {
    if (dist < curr->value || curr->value == -1.0) {
        curr->value = dist;
        for (int i = 0; i < curr->permutaitonSize; i++) {
            curr->p[i] = position[i];
        }
    }

    return curr;
}

/*
 * Create a space for updating the shortest scaled footrule distance
 */
Shortest makeFootrule(int size) {
    Shortest new = malloc(sizeof(*new));
    if (new == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    new->value = -1.0;
    new->permutaitonSize = size;
    new->p = calloc(size, sizeof(int));

    return new;
}

/*
 * Free the record for the positions of urls and the distance
 */
void freeDist(Shortest footRule) {
    free(footRule->p);
    free(footRule);
}

/*
 * Swap two integers 
 */
void swap(int *x, int *y) {
    int temp;
    temp = *x;
    *x = *y;
    *y = temp;
}

/*
 * Generate factorial of a number
 */
int factorial(int n) {
    return n >= 1 ? n * factorial(n - 1) : 1;
}

/**
 * Add value into a set
 * logic is from COMP2521 lecture code setADT
 */
Set SetInsert(Set s, char url[MAX_URL_LENGTH]) {
    if (s->urlFirst == NULL) {
        s->numUrls++;
        s->urlFirst = createUrl(url, s->numUrls);
        return s;
    }

    for (Url u = s->urlFirst; u != NULL; u = u->next) {
        if (strcmp(url, u->url) == 0) {
            return s;
        }

        if (u->next == NULL) {
            s->numUrls++;
            u->next = createUrl(url, s->numUrls);
        }
    }

    return s;
}

/**
 * Create a union set from the given sets
 * logic is from COMP2521 lecture code setADT
 */
Set SetUnion(AllSets allS) {
    Set unionSet = creatSet();

    for (Set s = allS->setHead; s != NULL; s = s->nextSetH) {
        for (Url u = s->urlFirst; u != NULL; u = u->next) {
            unionSet = SetInsert(unionSet, u->url);
        }
    }

	return unionSet;
}

/*
 * Free whole 2D linked list struct
 */
void freeAll(AllSets sets) {
    Set currSet = sets->setHead;
	while (currSet != NULL) {
		Set tempSet = currSet;
		currSet = currSet->nextSetH;
        freeSet(tempSet);
	}

    // free allSets
	free(sets);
}

/*
 * Free sets
 */
void freeSet(Set tempSet) {
    Url currUrl= tempSet->urlFirst;
    while (currUrl != NULL) {
        Url tempUrl = currUrl;
        currUrl = currUrl->next;

        free(tempUrl);
    }

    // free set head
    free(tempSet);
}

/*
 * Create a space for url
 */
Url createUrl(char url[MAX_URL_LENGTH], int position) {
    Url new = malloc(sizeof(*new));
    if (new == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    strcpy(new->url, url);
    new->next = NULL;
    new->position = position;

    return new;
}

/*
 * Append the url to the last
 */
Url urlAppend(Url u, char url[MAX_URL_LENGTH], int position) {
    if (u == NULL) {
        return createUrl(url, position);
    }

    u->next = urlAppend(u->next, url, position + 1);
    return u;
}

/*
 * Create a space for set
 */
Set creatSet(void) {
    Set new = malloc(sizeof(*new));
    if (new == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    new->urlFirst = NULL;
    new->nextSetH = NULL;
    new->numUrls = 0;

    return new;
}

/*
 * Append the set to the last
 */
Set setAppend(Set s) {
    if (s == NULL) {
        return creatSet();
    }

    s->nextSetH = setAppend(s->nextSetH);
    return s;
}

/*
 * Create a 2D linked list that store every ranks as a set
 */
AllSets SetNew(int argC, char *argV[]) {
    int i;

    AllSets allS = malloc(sizeof(*allS));
    if (allS == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    allS->numSet = argC - 1;
    allS->setHead = NULL;

    for (i = 0; i < allS->numSet; i++) {
        allS->setHead = setAppend(allS->setHead);
    }

    char *urlPage = malloc(sizeof(char) * MAX_URL_LENGTH);
    Set s = allS->setHead;
    for (i = 1; i < argC; i++) {
        FILE *fp = fopen(argV[i], "r");
        while (fscanf(fp, "%s", urlPage) == 1) {
            s->urlFirst = urlAppend(s->urlFirst, urlPage, 1);
            s->numUrls++;
        }

        fclose(fp);

        s = s->nextSetH;
    }

    free(urlPage);

    return allS;
}

/*
 * Print urls in the set
 */
void printSet(Set s) {
    for (Url u = s->urlFirst; u!= NULL; u=u->next) {
        printf("(%s %d)", u->url, u->position);
    }

    printf("\n");
}

/**
 * Print all the information in the 2D linked list 
 */
void printAll(AllSets allS) {
    printf("there are %d sets\n", allS->numSet);

    for(Set s = allS->setHead; s != NULL; s=s->nextSetH) {
        printf("%d\n", s->numUrls);
        printSet(s);
    }
}