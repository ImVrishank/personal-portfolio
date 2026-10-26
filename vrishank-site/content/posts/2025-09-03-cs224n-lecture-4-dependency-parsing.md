---
title: "Lecture 4: Dependency Parsing"
slug: cs224n-lecture-4-dependency-parsing
date: 2025-09-03
category: notes
tags: [cs224n, nlp, course-notes]
summary: "Stanford CS224N lecture 4 notes: phrase structure and dependency parsing, and how words combine into phrases and sentences."
---

## Phrase Structure

This is a key part in the linguistics part of NLP. This takes words and organizes them into phrases based off the identity of the word. When i say identity of the word, i mean is it an adjective? is it is a verb? is it a noun? and so on.  
Using these we can build phrases, Phrases can be divided into preposition phrases and noun phrases. These phrases are now concatenated to make a bigger phrase. Eventually leading to a sentence.

Here's how we can think about a Noun Phrase:  
**(article) + (adjectives) + (noun)**  
Examples:  
The large, blue cat  
The yellow hat  
The red bottle  
and so on...

Here's how we can think about a Prepositional Phrase:  
**(preposition) + (Noun Phrase)**  
It is a sub category of a Noun Phrase.  
Examples:  
By the door  
On the table  
Below the car  
and so on...

Building Larger Noun Phrases Using *Prepositional Phrases*:  
**(Noun Phrase) + (Prepositional Phrase)**

Examples:  
The yellow hat by the door  
The green bottle on the shelf  
The silver chain on the table  
and so on...

Building Verb Phrases:  
**(Verb) + (Preposition)**  
Examples:  
Talk to  
Fly by  
Speak to  
and so on...

Building Larger Noun Phrases Using *Verb Phrases*:  
**(Verb Phrase) + (Article) + (Noun Phrase)**  
Examples:  
Talk to a blue cat  
Cry with the bald man  
Fight with the stupid woman  
and so on...

Now that we see how we build sentences, We also get an idea of how important it is to divide words into categories like *Noun*, *Adjective*, *Prepositions*, *Verbs*, *Articles* and so on...

Here is a look at Bigger Phrase as a Sentence:

::figure{src="/media/imported/cs224n-lecture-4-dependency-parsing/1.png" alt=""}

Our main subject is the word "crate", now crate is linked to the words "in the large" (noun phrase), "in the kitchen" (preposition phrase), also "by the door" (secondary proposition phrase) as it speaks about the first preposition phrase ("in the kitchen"). Finally the action word binds it all together. "Look in" (Verb Phrase). All these phrases together make a functional sentence. The most importance is given to the words "Look in" and "crate" in this sentence.

### What is the point in me telling all this now?

We want to build a model which understands "sentence structure". Understanding sentence structure is the first step towards understanding the language correctly.

#### A few interesting examples on how ambiguous sentences can be

#### Example 1

News headline: **Scientists count whales from Space**

One interpretation could be: The scientists are counting the amount of whales that originated from space. (the attention between *whales* and *from space* is high)  
The other interpretation could be: The scientists from space are counting the amount of whales in the seas. (the attention between the *Scientists count* and *from space* is high)

Which interpretation is right is very obvious for us humans, but this is a huge challenge in the deep learning world.

#### Example 2

News headline: **The Board approved (its acquisition) (by Royal Trustco Ltd.) (of Toronto) (for \$27 a share) (at its monthly meeting)**  
This is a completely functional sentence. But look at the attentions of each phrases to each word here.  
"its acquisition" refers to the next phrase "by Royal Trustco Ltd."  
"of Toronto" refers to the phrase "by Royal Trustco Ltd."  
"for \$27 a share" refers to the phrase "its acquisition"  
"at its monthly meeting" refers to the word "approved"

This is a fairly easy to make out, But again very ambiguous for a computer.

#### Example 3

News headline: **shuttle veteran and longtime NASA executive Fred Gregory appointed to board**

This could refer to two people, one a shuttle veteran and the longtime NASA executive Fred Gregory.

This could refer to the same person, Fred Gregory, who is both a shuttle veteran and a longtime NASA executive.

### Verdict

English is a stupid language. It has a lot of ambiguity in its syntax. How do we work around this?

## Dependency Parsing

Dependency parsing is a method for representing the syntactic structure of a sentence. It focuses on understanding the relationship between words. You could use dependency parsing as a way of representing each sentence as a tree, where the root is the main word in the sentence and the rest of the words in the sentence are related to this word in a way down the tree of nodes.

Another way of representing this is by drawing arrows from the head to the rest of the phrases, where it shows that the phrases are dependent on the head word.

### Transition-Based Parsing For Dependency Parsing

As we have seen before Dependency Parsing mainly identifies the head of a sentence and the head's modifiers and arguments in a sentence.

Transition-Based Parsing is a method used for Dependency Parsing. Here is how it works:

In Transition-Based Parsing, we have 3 operations:

1. Shift
2. Left-Arc
3. Right-Arc
We also have a Root ( $\alpha$ ), rest of the words ( $\beta$ ).  
We have two stacks, one is the $\alpha$ stack and the other is the $\beta$

In the beginning, the $\alpha$ stack has just the root word, and $\beta$ stack has all the other words of the sentence.

1. Shift:
This function moves one word from the $\beta$ stack to the $\alpha$ stack.
2. Right-Arc
This function first pops 2 elements from the stack and makes a dependency, what this means is, it makes sure that the word on the Left is dependent on the word on the Right. and now it removes the dependent word (The one on the left), then it pushes back only the main word to the $\alpha$ stack.
3. Left-Arc
This function does the same as above, but it makes it such that that the Right word is dependent on the Left. So, it pops 2 elements from the stack, draws the relation, removes the dependent word(the one of the Right), then it pushes back the main word(the one on the Left)  
So we first Shift, then Left-Arc, or Right-Arc depending on the dependency of the word. We stop this when we have no words left in $\beta$ and only the root in the stack $\alpha$.
