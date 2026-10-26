---
title: "Lecture 2: Word vectors and Language Models"
slug: cs224n-lecture-2-word-vectors-and-language-models
date: 2025-09-03
tags: [cs224n, nlp, course-notes]
summary: "Stanford CS224N lecture 2 notes: bag-of-words, how word vectors are learned, and language models."
---

## Bag of Words (BoW) model

A bag of words model is the most naive model that cs224n teaches. Here's how it works:  
Lets say you have a large dataset of sentences which you intend on using as your training dataset. You then split these sentences, each sentence is your training example. You also make a list of all the unique words in the dataset. Now you can make the vocabulary.

The vocabulary is a table where you have the frequency of the occurrence of each word in the training example. This gives you a huge sparce matrix. Each row is a feature. These rows are called the word vectors. Now you could pass this vector into any model like linear regression, neural network, and so on. Once trained you can output random sentences that will kind of make sense.

This could also be used to classify spam or ham email, and other such stuff. Then the email would be your feature vector/word vector. Whether the email is spam or ham would be the label.

### Working of the word2vec model

The word2vec algorithm first makes a vocabulary of the all the words in the corpus. Each word in the vector is 2 vectors associated with it. One of them is for when the word behaves as a center word and the other is for when the word behaves as an outside word. Both are used in different scenarios.

Let us assume that we already have a center word. Now we let the model guess the next word.  
How would the model guess the next word?  
It would take the vector of the center word (the one for when the word behaves as a center word), and it would take all the other words in the vocabulary's word vector (one for when they behave as an outside word). It takes the dot product of these two vectors, then passes it through a softmax. This gives the probability of the next word.  
Now the outside word corresponding to the highest probability is given as the output of the model. Then we compare this word with the actual word in the corpus. By compare, we mean the probability that we got after using softmax. This is how we get the error. We then use an optimizer of our choice to minimize the error.

Dimensionality of the word vectors is a design choice. The bigger the dimension of the word vector, the more details of the word you are able to capture. People take the word vectors length to be 8, sometimes even 3000. It completely depends on the compute you have.

After you are done with the training of the model. You would need to take the average of the two word vectors you had before. This is will give the characteristic word vector for each word.

#### Why is this model stupid?

This model does not care about what's to the left or to the right of the center word, all it cares about is the center word and makes predictions based off the center word. This would be disastrous in many ways.  The one way that i could think about right now is: Let us assume that the probability of the word "is" appearing after "What" is very high. This would mean that the model would always give the output "what is". This isn't right.

#### Other interesting things you could do with this model

Now that you have trained this model. You end up with a bunch of word vectors of N dimension. These are just vectors in an N dimensional space originating from the origin and pointing to that specific vector's point.  
Using this info, you could ask it what is the point closest to the point mentioned in the N dimensional space. Or you could ask it what is closest to the negative of the a word vector, which is just multiplying each element of the word vector with (-1) and then asking what is the closest element to this point in space. This should give you the opposite of any word (not always accurate). You could also give it analogies(man : women :: king : ?). This would perform a certain operation to get from man to woman, and then perform the same operation on the word king, this would intuitively give you the word "queen". Or you could think of it in this way.  
All really basic vector math if you think about it.

::figure{src="/media/imported/cs224n-lecture-2-word-vectors-and-language-models/1.png" alt=""}

#### Negative sampling as an alternative to Negative-log-likelihood

if we use negative log likelihood, we will need to sum and exponentiate over all the words, we could have almost like 400,000 words in a vocabulary. This is very expensive to compute. So we have come up with an alternative.

Here is how Negative Sampling works:  
Let us work with the sentence: **I want a glass of ORANGE juice  to go along with my cereal**  
Orange is our context word.

Now we make a table with 1 positive example and K number of negative samples of context target pairs. These negative samples are taken at random from the , keeping the context same. Then we label the target accordingly.  
It is okay, if we end up with a context pair word by mistake as above too.

::figure{src="/media/imported/cs224n-lecture-2-word-vectors-and-language-models/2.png" alt=""}

K must be 5 - 20 for normal pieces of data.  
K must be 2-5 for larger pieces of data.

With Softmax, we would have ended up with a huge sum in the deominator, this would be computationally hard. So here we choose not to use one hot vectors. We instead use a sigmoid and make it such that this gives a value close to 1 if context word and target are paired correctly. else we get a value close to 0.

::figure{src="/media/imported/cs224n-lecture-2-word-vectors-and-language-models/3.png" alt=""}

#### Dealing with synonyms

We have words with the same spelling that have different meanings when used in different scenarios, these are what we call synonyms. Synonyms can be a pain in the ass for word vectors. What you could do is split them into different clusters of the same word. honey could be ${honey}_{1}$ *which would mean the honey you get in shops, which you use as a sweetener and* ${honey}_{2}$ could be what you'd call your partner. How would you tell which honey in the corpus belongs to which cluster. You would need an algorithm to separate the two based off their surrounding words.

### Named entity recognition (NER)

::figure{src="/media/imported/cs224n-lecture-2-word-vectors-and-language-models/4.png" alt=""}

Again, we look at context and then predict what kind of entity it is.  
We take a window of words, lets say like 5 words to the left and right. Then we take those 10 words in total and classify whether or not it is a place. This could be done using a simple neural network.

#### Neural classifiers vs Traditional classifiers

**Traditional classifiers**  
These are classifiers like logistic regression, Softmax regression and so on. These are mainly capable of giving a linear decision boundary. This could limit the mode a lot. We want to have a model which is capable of giving a non linear decision boundary.

::figure{src="/media/imported/cs224n-lecture-2-word-vectors-and-language-models/5.png" alt=""}

This is the decision boundary that a traditional classifier like logistic regression gives.

**Neural Classifiers**  
These are capable of giving a non linear decision boundary. These use a neural network to give the required decision boundary.

::figure{src="/media/imported/cs224n-lecture-2-word-vectors-and-language-models/6.png" alt=""}

Activation functions are what make the decision boundary non linear.

Lets look at the example of the Paris, France and Paris Hilton word vectors.  
We have a sentence: Museums in Paris are amazing.  
We now take the word vectors of all these 5 words, concatenate them into a huge singular vector. Here let us assume we are taking each of the word vector to be of 100 dimensions. so we have a 500 dimension vector after concatenation.

Now our input layer of the neural network will have 500 neurons. We are also looking to reduce the dimensionality, so the next hidden layer will have lesser number of neurons, lets say it has 8 neurons.

We go from the input layer to the first hidden layer by multiplying the input column matrix (of 500 dimension) with the weights matrix and then adding the bias matrix. The weights matrix should have dimensions of (8 x 500), and the bias matrix should have dimensions (8 x 1). This is because we need to feed it to the next hidden layer of dimensions (8 x 1). Now after the transformation above, we pass it through an activation function, this is what gives it non linearity.

Later, we need to pass the hidden layer to the output later having just one node. This one node will give us the score. The score tells us whether the center word (paris) is the place in france or the person. We could do this in the same way as before, but keep the activation function as the sigmoid. This is helpful because if the score is above 0.5 it could be class 1, and below 0.5, it would be class 2.

::figure{src="/media/imported/cs224n-lecture-2-word-vectors-and-language-models/7.png" alt=""}
