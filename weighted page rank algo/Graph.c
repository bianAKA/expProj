// from COMP2521 w8 lab code with some modification
// Adjacency Matrix Representation - directed 

// Written by: Bianca Ren
// Date: 7th Nov 2022

#include <assert.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#include "Graph.h"

struct graph {
    int **edges;   
    int nV;     
    int nE;
    int col;      
};

void GraphShow(Graph g) {
    int i, j;

    printf("Number of vertices: %d\n", g->nV);
    printf("Number of columns: %d\n", g->col);
    printf("Number of edges: %d\n", g->nE);
    printf("   |");

    for (i = 0; i < g->col; i++) {
        printf("%d | ", i);
    }

    printf("\n-------------------------------\n");

    for (i = 0; i < g->nV; i++) {
        for (j = 0; j < g->col; j++) {
            if (j == 0) {
                printf("%d | ", i);
            }
         
            if (g->edges[i][j]) {
                printf("%d | ", g->edges[i][j]);
            } else {
                printf("  | ");
            }
        
        }
        printf("\n-------------------------------\n");
    }
    
    printf("\n");
}

Graph GraphNew(int row, int col) {
    assert(row > 0);

    int nV = row;

    Graph g = malloc(sizeof(*g));
    if (g == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    g->nV = nV;
    g->nE = 0;
    g->col = col;

    g->edges = malloc(nV * sizeof(int *));
    if (g->edges == NULL) {
        fprintf(stderr, "error: out of memory\n");
        exit(EXIT_FAILURE);
    }

    for (int i = 0; i < nV; i++) {
        g->edges[i] = calloc(col, sizeof(int));
        if (g->edges[i] == NULL) {
            fprintf(stderr, "error: out of memory\n");
            exit(EXIT_FAILURE);
        }
    }

    return g;
}

void GraphFree(Graph g) {
    for (int i = 0; i < g->nV; i++) {
        free(g->edges[i]);
    }

    free(g->edges);
    free(g);
}

int GraphNumVertices(Graph g) {
    return g->nV;
}

bool GraphInsertEdge(Graph g, urlNum src, urlNum dest) {
    if (g->edges[src][dest] == 0) {
        g->edges[src][dest] = 1;
        g->nE++;
        return true;
    } else {
        return false;
    }
}

bool GraphRemoveEdge(Graph g, urlNum v, urlNum w) {
    if (g->edges[v][w] != 0.0) {   // edge e in graph
        g->edges[v][w] = 0.0;
        g->nE--;
        return true;
    } else {
        return false;
    }
}

int GraphIsAdjacent(Graph g, urlNum v, urlNum w) {
    return g->edges[v][w];
}

int edgeValue(Graph directUrl, int x, int y) {
    return directUrl->edges[x][y];
}

int numOfOutLinks(Graph directUrl, int currUrl) {
    int numOutL = 0;
    for (int nextUrl = 0; nextUrl < GraphNumVertices(directUrl); nextUrl++) {
        if (edgeValue(directUrl, currUrl, nextUrl)) {
            numOutL++;
        }
    }

    return numOutL;
}

int numMatchingTerms(Graph invertedIndex, int url) {
    int numMatch = 0;
    for (int i = 0; i < invertedIndex->nV; i++) {
        if (invertedIndex->edges[i][url] == 1) {
            numMatch++;
        }
    }

    return numMatch;
}
