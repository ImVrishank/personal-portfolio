---
title: "Neural Networks"
slug: neural-networks
date: 2025-07-05
category: ai
tags: [neural-networks, backpropagation, math]
summary: "A four-part walkthrough of neural networks: matrix-calculus review, forward propagation, the derivatives behind a neuron, and the four equations of backpropagation derived by hand."
---

## Contents:

### Part 1: Introduction:

1.1 Prerequisites
1.2 Agenda
1.3 Notation
1.4 Big Picture
1.5 Matric Calculus Review
1.5.1 Gradients
1.5.2 Jacobians
1.5.3 Scalar Chain Rule
1.5.4 Jacobian Chain Rule

### Part 2: Forward Propagation

2.1 The Neuron Function
2.2 Weight and Bias Indexing
2.3 A Layer of Neurons

### Part 3: Derivatives of Neural Networks & Gradient Descent

3.1 Motivation & Cost Function
3.2 Differentiating a Neuron's Operations
3.2.1 Binary Elementwise Functions
3.2.2 Hadamard Product
3.2.3 Scalar Expansion
3.2.4 Sum
3.3 Derivation of an Activation
3.4 Derivation of the cost
3.5 Intuition: derivative of the cost w.r.t the weights
3.6 Differentiating w.r.t the bias
3.7 Gradient Descent Intuition
3.8 The Gradient Descent Algorithm & stochastic Gradient Descent
3.9 Derivation of a layer (and why it doesn't work)

### Part 4: Backpropagation:

4.1 The Error of a Node
4.2 The four equations of Backpropagation
4.2.1 E1: Error of $a^L$
4.2.2 E2: Error of $a^l$
4.2.3 E3: Cost w.r.t biases
4.2.4 E4: Cost w.r.t weights
4.2.5 Equation 4 vectorized
4.3 Tying Part 3 and Part 4 together
4.4 The Backpropagation Algorithm
4.5 Looking forward

## Part 1: Introduction

### 1.1: Prerequisites

- Basic Linear Algebra
- Multivariable Calc
  - Differential
  - Jacobians/Gradients
- Base ML Knowledge

### 1.2: Agenda

Talks about what each of the parts and the sections inside them cover.

### 1.3: Notation

- M: The number of Training examples
- N: The number of features
- L: The number of Layers in NN
  - l: Specific layer
- $W^l$: The weights of the next layer.
  - If data is being transmitted from the $p^{\text{th}}$ layer to the $(p+1)^{\text{th}}$ layer, then the Weights between them will be labelled as $W^{p+1}$.
- $b^l$: The bias for the next layer.
  - Works the same was as that of weights.
- $X_i$: Refers to the $i^{\text{th}}$ feature.

### 1.4: Big Picture:

The stigma that Neural Networks are hard is very wrong. It is just a huge function. In this function you are going to be working to reduce the cost function. This reducing of cost function is done by Calculus. That's about it.

### 1.5: Matrix Calculus Review:

**Gradient**( $\nabla$): A quick review

$$
F(x,y) = x^2 + \cos(y)
$$

$$
\nabla F(x, y) = \begin{bmatrix} \frac{\partial F}{\partial x} \\ \frac{\partial F}{\partial y} \end{bmatrix}
$$

$$
\nabla F(x,y) = \begin{bmatrix} 2x \\ -\sin(x) \end{bmatrix}
$$

- Then you plug in your value of X and Y to get the gradient vector.
**Jacobians(J)**: a quick review  
Given functions like these:

$$
f_1(x,y) = 2x + y^3,\quad f_2(x,y) = e^y - 13x
$$

Which is represented as:

$$
F(x,y) = \begin{bmatrix} f_1 \\ f_2 \end{bmatrix}
$$

The formula to find the Jacobians is:

$$
J = \begin{bmatrix} \frac{\partial f_1}{\partial x} & \frac{\partial f_1}{\partial y} \\ \frac{\partial f_2}{\partial x} & \frac{\partial f_2}{\partial y} \end{bmatrix}
$$

Then plug in your values for X and Y.

**Jacobian Chain Rule:**  
This is the algorithmic way of applying the chain rule.  
Assume we had a function F(x, y)

$$
F(x,y) = \begin{bmatrix} \sin(x^2 + y) \\ \ln(y^3) \end{bmatrix}
$$

Our goal is to find: $\frac{\partial F}{\partial x}$  
Here is how we split it

$$
g = \begin{bmatrix} g_1 = x^2 + y \\ g_2 = y^3 \end{bmatrix}, \quad f = \begin{bmatrix} \sin(g_1) \\ \ln(g_2) \end{bmatrix}
$$

Now on differentiating:

$$
\frac{\partial g}{\partial x} = \begin{bmatrix} 2x & 1 \\ 0 & 3y^2 \end{bmatrix}, \quad \frac{\partial f}{\partial g} = \begin{bmatrix} \cos(g_1) & 0 \\ 0 & \frac{1}{g_2} \end{bmatrix}
$$

Finally:

$$
\frac{\partial f}{\partial x} = \frac{\partial f}{\partial g} \cdot \frac{\partial g}{\partial x}
$$

After substituting g values.

$$
\frac{\partial F}{\partial x} = \begin{bmatrix} 2x & 1 \\ 0 & 3y^2 \end{bmatrix} \cdot \begin{bmatrix} \cos(x^2 + y) & 0 \\ 0 & \frac{1}{y^3} \end{bmatrix}
$$

## Part 2: Forward Propagation:

### 2.1 The Neuron Function:

::figure{src="/media/imported/neural-networks/1.png" alt=""}

Lets take a good look at this above diagram. The Green circle is the Neuron.  
Each Neuron has a bias (b), and a weights matrix($W \in \mathbb{R}^N$) which contain N number of values. N is the number of neurons in the previous layer. The math that happens before storing a value in the neuron is:

$$
\sigma\left( \sum_{i=1}^{N} (X_i \cdot W_i) + b \right)
$$

::figure{src="/media/imported/neural-networks/2.png" alt=""}

The $\sigma$ here is a sigmoid function. It is our activation function  
This is a squishify function, which takes values from negative infinity to positive infinity and plots them between 0 and 1.  
The idea is that each neuron will now store a scalar value.  
Now lets talk about how to efficiently work on the summation of $\sum_{i=1}^{N} x_i W_i$. We know that X and W are stored in the form of matrices and both of them have N values. you could just take the dot product of X and W to get this summation. Remember to transpose one of them!

So essentially, each neuron stores a value calculates with the inputs given by all the neurons of the previous layer using the formula:

$$
\text{value} = \sigma(X \cdot W^T + b)
$$

Also, remember the notation:

$$
Z = X \cdot W^T + b
$$

so we could also say,

$$
value = \sigma(Z)
$$

### 2.2: Weights and Bias Indexing

Notation:

$W^{l}_{jk}$ is the weight representation.  
Here:

- $l$ is the layer which the weight is going into.
- $j$ is the number of the neuron that info is being taken from in the $l^{\text{th}}$ layer.
- $k$ is the number of the neuron that info is being given to in the $(l-1)^{\text{th}}$ layer.

::figure{src="/media/imported/neural-networks/3.jpg" alt=""}

- $B^l_k$ is the representation for bias.
Here:
- $l$ is the layer on the node
- $k$ is the numbering of that node in that layer.
Sometimes, we have a singular bias for an entire layer $B^l$.

### 2.3 A layer of Neurons

We know that all the Neurons store a singular scalar value. So, we just have a column matrix containing all the Neurons' values. The Neuron's value is called its Activation. The number of values in the column matrix will be the number of Neurons in that layer, $l$. Let us call this column matrix $S^l$, where $l$ corresponds to its layer.

Lets talk about the storage of Weights matrix. We know that each Neuron will have a connection with all the previous layer's Neurons. This means: if the number of neurons in $(l-1)^{\text{th}}$ layer is $p$and the number of neurons in the $l^{\text{th}}$ layer is $q$. Then the number of values in the Weights matrix just for layer $l$ will be $(p \times q)$.

::figure{src="/media/imported/neural-networks/4.png" alt=""}

Now with this you could directly get the values of the $S^l$.

$$
S^l = \sigma(W^l \cdot a^{(l-1)} + b^l)
$$

Now that you have $S^l$, you could do the same and find out $S^{(l+1)}$ by treating $S^l \text{ as } a^l$.

## Part 3: Derivatives of Neural Networks

### 3.1 Motivation and Cost Function

You could imagine a machine with a lot of knobs. Each knob affects the final output by a certain amount. Keep in mind that some knobs affect the final output more than the others. Now how do you go about finding how each of these knobs change the final output and to what extent do they affect them?

That is what this entire section deals with.

**Error Function:**  
The error function that we use here is **MSE**.

$$
MSE = \frac{1}{m} \sum_{i=1}^{m} (\hat{y}_i - y_i)^2
$$

Keep in mind that the calculation of the loss is done in the Feedforward half of the NN. The gradient of the loss is done in the backpropagation half of the NN.

#### 3.1.1 Derivation of a Binary element-wise operation

A good place to start would be: What is a binary element-wise operation?  
It is an operation which takes in two vectors and performs some element wise operation on them and gives out a singular vector.  
This is a quick explanation as to why Jacobians here are always going to be diagonal matrices. Emphasis on the HERE, and by HERE, we mean when we are working with element wise functions.

$$
F(v, w) = \begin{bmatrix} v_1 \\ v_2 \\ \vdots \\ v_n \end{bmatrix} + \begin{bmatrix} w_1 \\ w_2 \\ \vdots \\ w_n \end{bmatrix}
$$

Here we have a function F(v, w). It is a function which is undergoing a binary element-wise operation (+). Each row of F(v, w) is given names like $F_1, F_2, \ldots, F_n$.  
Also, you need to keep note that $F_1$ contains $V_1$ and no other V's. Same with the other rows.

so now on differentiating, you can clearly observe why we get a diagonal matrix.

$$
\frac{\partial F}{\partial V} = J = \begin{bmatrix}\frac{\partial F_1}{\partial V_1} & \frac{\partial F_1}{\partial V_2} & \cdots & \frac{\partial F_1}{\partial V_n} \\ \frac{\partial F_2}{\partial V_1} & \frac{\partial F_2}{\partial V_2} & \cdots & \frac{\partial F_2}{\partial V_n} \\\vdots & \vdots & \ddots & \vdots \\\frac{\partial F_n}{\partial V_1} & \frac{\partial F_n}{\partial V_2} & \cdots & \frac{\partial F_n}{\partial V_n}\end{bmatrix}
$$

#### 3.3.2 Derivative of a Hadamard Product

A Hardmard Product is basically a binary element wise operation where we multiply 2 vectors element wise.

$$
F(v, w) = \begin{bmatrix}v_1 \times w_1 \\ v_2 \times w_2 \\ \vdots \\ v_n \times w_n \end{bmatrix}
$$

$$
\frac{\partial F}{\partial V} = J = \begin{bmatrix}\frac{\partial F_1}{\partial V_1} & \frac{\partial F_1}{\partial V_2} & \cdots & \frac{\partial F_1}{\partial V_n} \\ \frac{\partial F_2}{\partial V_1} & \frac{\partial F_2}{\partial V_2} & \cdots & \frac{\partial F_2}{\partial V_n} \\\vdots & \vdots & \ddots & \vdots \\\frac{\partial F_n}{\partial V_1} & \frac{\partial F_n}{\partial V_2} & \cdots & \frac{\partial F_n}{\partial V_n}\end{bmatrix}
$$

$$
\frac{\partial F}{\partial V} = J = \begin{bmatrix}w_1 & 0 & \cdots & 0 \\ 0 & w_2 & \cdots & 0 \\\vdots & \vdots & \ddots & \vdots \\0 & 0 & \cdots & w_n\end{bmatrix}
$$

#### 3.2.3 Derivative of a Scalar Expansion

Let us take a quick look at how a computer solves this:

$$
F(x) = A \cdot \begin{bmatrix}p \\q \\r\end{bmatrix}
$$

then multiplies it. This concept is called **Broadcasting**. Then depending on what the operation is, we get the derivative as before.

$$
F(x) = \begin{bmatrix}a \\ a \\ a\end{bmatrix}^\top \begin{bmatrix}p \\ q \\ r\end{bmatrix}
$$

#### 3.2.4 Derivative of a Sum

$$
V = \begin{bmatrix}v_1 \\v_2 \\v_3 \\\vdots \\v_n\end{bmatrix}= \sum_{i=1}^n (g(v))_i
$$

where we are applying the function g(v) to every element then summing them up

$$
\begin{bmatrix}\frac{\partial S}{\partial v_1} & \frac{\partial S}{\partial v_2} & \cdots & \frac{\partial S}{\partial v_n}\end{bmatrix}
$$

Where: $S = \sum_{i} v_{i}$  
hence we can clearly see that all of them will end up as 1.

$$
\begin{bmatrix}1 & 1 & \cdot & \cdot & 1\end{bmatrix}
$$

#### 3.3 Derivatives of a Neuron's Activation

Now we will use all the above stuff:  
Here is what we want to do:

$$
a = \sigma(W^T X + b)
$$

We could rewrite this as:

$$
a = \sigma\left(\sum(W \oplus X) + b\right)
$$

Where $\oplus$ is the symbol for Hadamard product.  
With the chain rule: keep in mind H = W $\oplus$ X and S = sum(H)

$$
\frac{\partial a}{\partial W} = \frac{\partial a}{\partial Z} \cdot \frac{\partial Z}{\partial S} \cdot \frac{\partial S}{\partial H} \cdot \frac{\partial H}{\partial W}
$$

$$
\frac{\partial a}{\partial b} = \frac{\partial a}{\partial Z} \cdot \frac{\partial Z}{\partial b}
$$

Lets work on the first the weights first:

$$
\frac{\partial H}{\partial W} = \begin{bmatrix}x_1 & 0   & \cdot & \cdot & 0 \\0   & x_2 & \cdot & \cdot & 0 \\\cdot & \cdot & \ddots & & \cdot \\\cdot & \cdot & & \ddots & \cdot \\0   & 0   & \cdot & \cdot & x_n\end{bmatrix}
$$

Similarly using derivatives of sums:

$$
\frac{\partial S}{\partial H} = 1^T
$$

And lets assume $\sigma$ is relu here because it makes out life easier and is more popular now.  
Hence:

$$
\frac{\partial a}{\partial Z} =\begin{cases}1, & \text{if } z > 0 \\0, & \text{otherwise}\end{cases}
$$

Now lets substitute all these values. We wont be assuming that $\frac{\partial a}{\partial Z}$ is 0, because that just cancels out everything.

$$
\frac{\partial a}{\partial W} = 1 \cdot 1 \cdot 1^T \cdot \begin{bmatrix}x_1 & x_2 & \cdot & \cdot & x_n\end{bmatrix}
$$

Working this out:

$$
\frac{\partial a}{\partial W} = \begin{bmatrix}x_1 & x_2 & \cdot & \cdot & x_n\end{bmatrix}
$$

Now if Z<0, then:

$$
\frac{\partial a}{\partial W} = 0
$$

**Working on bias now**

$$
\frac{\partial a}{\partial b} = \frac{\partial a}{\partial Z} \cdot \frac{\partial Z}{\partial b}
$$

We already calculated $\frac{\partial a}{\partial Z}$, and $\frac{\partial Z}{\partial b} = 1$, hence we get:  
if Z>0

$\frac{\partial a}{\partial b} = 1$  
if Z<0

$$
\frac{\partial a}{\partial b} = 0
$$

### 3.4 Derivative of the cost for a simple neural network

Here we use the MSE for the Loss function.

Before this we used to have inputs to a neuron. X, the neuron itself, which stored the weights W and the bias B. Using W, B and X, we get Z, passing it through an activation function, we get A.  
Now we add onto this, and after we get A, we subtract it by the actual value we expect the neuron to get, $\hat{Y}$.  Then we tend to normalize this error, using a tool like MSE or MAE(Mean absolute error). This is what we call the cost function. It is represented by $J(\theta)$.

::figure{src="/media/imported/neural-networks/5.jpg" alt=""}

Now that we know this, it shouldn't be too hard. Until now we had seen how the different aspects of a neuron like Z, or its activation function changes with respect to the weights and biases. Now we add onto that and see how the cost function changes with respect to the Weights and the Bias.

$$
\frac{\partial J}{\partial W}, \frac{\partial J}{\partial b}
$$

This is the final piece to the puzzle, the last link to the chain:

$$
\frac{\partial J}{\partial W} = \frac{\partial J}{\partial a}\times\frac{\partial a}{\partial W}
$$

$$
\frac{\partial J}{\partial b}=\frac{\partial J}{\partial a} \times\frac{\partial a}{\partial b}
$$

Now let us look at a dataset, We have the training examples as the columns and the feature numbers as the rows. Training example number will be shown by the superscript and the feature number as the subscript.

$$
X = \begin{bmatrix}X^1_1&X^2_1&.&X^m_1\\X^1_2&X^1_2&&X^m_2\\.&.&.&.\\X^1_n&X^2_n&.&X^m_n\end{bmatrix}
$$

Now lets see how we can break down the last chain:

If we take $v = Y - \hat{Y}$. Then:

$$
\frac{\partial J}{\partial W} = \frac{\partial J}{\partial V}\times \frac{\partial V}{\partial a}\times\frac{\partial a}{\partial W} = \frac{\partial J}{\partial V}\times\frac{\partial V}{\partial W}
$$

Now:

$$
\frac{\partial V}{\partial W} = \frac{\partial (Y - a^L)}{\partial W}
$$

Where $a^L$ is the value we have got from the neural network.

Since Y is a constant.

$$
\frac{\partial V}{\partial W} = -\frac{\partial a}{\partial W}
$$

The next step:

$$
\frac{\partial J}{\partial W} = \frac{\partial[ \frac{1}{2m} \sum_{i=0}^{i=m}V^2]}{\partial V}
$$

$$
\frac{\partial J}{\partial W} = \frac{1}{2m}\sum\frac{\partial V^2}{\partial V}
$$

$$
\frac{\partial J}{\partial W} = \frac{1}{2m}\sum2V \frac{\partial V}{\partial W}
$$

Now plug in the value of the derivative:

$$
\frac{\partial J}{\partial W} = -\frac{1}{2m}\sum2V \frac{\partial a}{\partial W}
$$

Now we considering the activation function is RelU and also value of Z is positive:

$$
\frac{\partial J}{\partial W} = -\frac{1}{m}\sum V \frac{\partial a}{\partial W}
$$

$$
\frac{\partial a}{\partial W} =\begin{bmatrix}x_1&x_2&.&.&x_n\end{bmatrix}
$$

We get:

$$
\frac{\partial J}{\partial W} = -\frac{1}{m}\sum_{i=0}^{i=m}V . \begin{bmatrix}x_1&x_2&.&.&x_n\end{bmatrix}
$$

Substituting value of V:

$$
\frac{\partial J}{\partial W} = -\frac{1}{m}\sum_{i=0}^{i=m}(Y-a^L)^T . \begin{bmatrix}x_1&x_2&.&.&x_n\end{bmatrix}
$$

Where $a^L = W^TX+b$. So the same thing as Z

if Activation function is RelU and value of Z is non positive:

$$
\frac{\partial J}{\partial W} = 0
$$

### 3.5 Understanding the derivative of cost w.r.t weights

Now Let us look at how this calculation is actually done:  
Let us consider

$$
e_i = (Y-a^L)
$$

Each training example has a different value of $e_i$.  
Hence we get:

$$
\frac{\partial J}{\partial W} = \frac{1}{m}\sum_{i=1}^{i=m}e_i.X^T
$$

Now for simplicity sake, let us take m=1, and that training example has 5 features. And $e_i$ is the error of that training example:

$$
\frac{\partial J}{\partial W} =  e_i \begin{bmatrix}X_1&X_2&X_3&X_4&X_5\end{bmatrix}
$$

Let us transpose this matrix so that it looks cleaner: (don't do it in the execution)

$$
\frac{\partial J}{\partial W} = \begin{bmatrix}X_1.e_i \\X_2.e_i \\X_3.e_i \\X_4.e_i \\X_5.e_i \end{bmatrix}
$$

Now if we look closely, This is exactly how how cost changes with respect to each weight.

$$
\frac{\partial J}{\partial W} = \begin{bmatrix}X_1.e_i \\X_2.e_i \\X_3.e_i \\X_4.e_i \\X_5.e_i \end{bmatrix} = \begin{bmatrix}\frac{\partial J}{\partial W_1}\\\frac{\partial J}{\partial W_2}\\\frac{\partial J}{\partial W_3}\\\frac{\partial J}{\partial W_4}\\\frac{\partial J}{\partial W_5}\\ \end{bmatrix}
$$

Let us now look at an example where we have M training examples:  
Notations:

- $X^m_n$: Superscript is the training example, and the subscript is the feature number

$$
\frac{\partial J}{\partial W} = \frac{1}{m}\begin{bmatrix}X_1^1.e_1 \\X_2^1.e_1 \\X_3^1.e_1 \\X_4^1.e_1 \\X_5^1.e_1 \end{bmatrix} + \begin{bmatrix}X_1^2.e_2 \\X_2^2.e_2 \\X_3^2.e_2 \\X_4^2.e_2 \\X_5^1.e_2 \end{bmatrix}+...+\begin{bmatrix}X_1^m.e_m \\X_2^m.e_m \\X_3^m.e_m \\X_4^m.e_m \\X_5^m.e_m \end{bmatrix}
$$

That is:

$$
\frac{\partial J}{\partial W} = \frac{1}{m} \begin{bmatrix}X_1^1.e_1 +...+X_1^m.e_m \\X_2^1.e_1 +...+X_2^m.e_m \\X_3^1.e_1 +...+X_3^m.e_m \\X_4^1.e_1+...+X_4^m.e_m  \\X_5^1.e_1 +...+X_5^m.e_m \end{bmatrix}
$$

The essence of this is very beautiful, Lets take a look at it:  
Each row represents how much the error $J$ changes when we tweak that corresponding weight $W_1, W_2, W_3,...,W_n$.

In simpler words, it tells you how sensitive the cost function is to each of the weights to that neuron.

### 3.6 Differentiating the Bias

Again lets take the chain rule and work on this:

$$
\frac{\partial J}{\partial W} =\frac{\partial J}{\partial V} \times\frac{\partial V}{\partial a^L} \times \frac{\partial a^L}{\partial W}
$$

Where $V = Y - a^L$.

We already know the value of

$$
\frac{\partial a^L}{\partial W} = 1 \forall Z>0
$$

And also:

$$
\frac{\partial V}{\partial a^L} = \frac{\partial (Y-a^L)}{\partial a^L} = -1
$$

Now finding: $\frac{\partial J}{\partial V}$

We know that

$$
J = \frac{1}{2m}\sum V^2
$$

$$
\frac{\partial J}{\partial V} = \frac{1}{2m} \sum_{i=1}^{i=M}\frac{\partial V^2}{\partial V}
$$

And hence we get:

$$
\frac{\partial J}{\partial V} = \frac{1}{m} \sum_{i=1}^{i=M}v
$$

Substituting all the above values:

$$
[\frac{\partial J}{\partial b} = -1 \sum_{i=1}^{i=M}(Z - \hat{Y})] \forall (Z>0)
$$

$$
[\frac{\partial J}{\partial b} = 0]\forall(Z<0)
$$

### 3.7 Gradient Descent Intuition

Now that we have got the values for

$$
\frac{\partial J}{\partial W} = \begin{bmatrix}X_1.e_1 \\X_2.e_1 \end{bmatrix}
$$

For a single training example with 2 features.  
Imagine a huge blanket as such:

::figure{src="/media/imported/neural-networks/6.png" alt=""}

Then the gradient always points to the highest point of the blanket from any point.  
Hence: Negative gradient points to lowest point of the blanket. The gradient is a vector of N dimensions pointing to the topmost point of the function.  
So a more accurate way of representing the above function would be as such:

$$
\nabla_w J =  \begin{bmatrix}X_1.e_1 \\X_2.e_1 \end{bmatrix}
$$

Where $\nabla_wJ$ is read as the gradient of J wrt W. It is a vector (2 dimensional here), pointing upward.  
So With the gradient function, we could tell on changing which weight do we get the most bang-for-buck with respect to the cost function.  
So each step needs to be in the direction of $-\nabla_wJ$ to reduce the overall loss.

### 3.8 Gradient descent algorithm and Stochastic Gradient Descent

Now that we have the gradient of the cost function with respect to the weights and biases.

$$
\nabla_{W,b} J = \begin{bmatrix}\frac{\partial J}{\partial W_1}\\\frac{\partial J}{\partial W_2} \\ .\\\frac{\partial J}{\partial b_1}\\.\\.\\ \frac{\partial J}{\partial W_n}\end{bmatrix}
$$

We can plug this into the traditional SGD algorithm:

$$
\theta = \theta - \alpha \times \nabla_{W, b}J
$$

Where $\theta$ is the weights vector, with each weights corresponding to the same differential in the gradient vector. $\alpha$ is the learning rate.

This is Gradient descent, what is Stochastic Gradient descent though?  
Lets say we have a Training set of m = 10,000,000 training examples. Then we would have to calculate:

$$
\frac{\partial J}{\partial W} = \frac{1}{10,000,000} \begin{bmatrix}X_1^1.e_1 +...+X_1^{10,000,000}.e_{10,000,000} \\X_2^1.e_1 +...+X_2^{10,000,000}.e_{10,000,000} \\X_3^1.e_1 +...+X_3^{10,000,000}.e_{10,000,000} \\X_4^1.e_1+...+X_4^{10,000,000}.e_{10,000,000}  \\X_5^1.e_1 +...+X_5^{10,000,000}.e_{10,000,000} \end{bmatrix}
$$

This would be painful to calculate, hence we break these down into batches, each of lets say.. 120 values. We then perform gradient descent over these batches. This would be computationally efficient. Now how do we stitch all of these batches values together. We just take one step per each batch. Remember to shuffle the training examples though.

### 3.9 Finding Derivative of an entire layer (and why it doesn't work the same way we did with one neuron)

Here we shall delve deeper into why we do not use the forward pass to calculate the change of the cost with respect to the weights of the first layer, the second layer and so on.

::figure{src="/media/imported/neural-networks/7.jpg" alt=""}

The loss with respect to each node of a certain layer $l$ and a certain node of that layer $j$: $\delta_{j}^{l}$

Now why is backpropagation better?  
Backpropagation makes sure you calculate all the values, including C, then we move backwards. By backwards, we calculate: $\frac{\partial C}{\partial a_{3}}$.

We store this value as we will need it later too.  
Then we move a step back to calculate how the weight of the node $W_{1}^{2}$ affects Cost. This is going to be:

$$
\frac{\partial C}{\partial W^{2}_{11}} = \frac{\partial C}{\partial a_{3}} \times \frac{\partial a_{3}}{\partial W_{11}^{2}}
$$

Now we just use the previously stored value and get this answer easily.

## Part 4: Backpropagation

### 4.1: The error of a Node

Let us get some notations clear before getting started with this:

- $\delta_{j}^{l}$:The error of the $j^{th}$node of the $l^{th}$ layer,
- $Z_{j}^{l}$:The Z of the $j^{th}$ node of the $l^{th}$ layer.
- $\Delta$: The small change made to Z.

We know that:

$$
a^{l}_{j} = \sigma(Z^l_{j})
$$

When we want to make a small change to this activation, we do not mess with the activation as a whole instead we add a small change to Z.

$$
Z_{j}^{l} = W^T.X + b + \Delta
$$

Then pass it through the activation function. And then we calculate the error of the node:

$$
\delta_{j}^l = \frac{\partial C}{\partial Z_{j}^l}
$$

Why does this make sense though?  
This is because if the value of error of the node is tiny, then on changing the node's parameters will not change the cost to a high extent. On the other hand, if it were high, that would mean, on changing the parameters of the node, we could drastically reduce the cost. Basically the same bang-per-buck idea.

### 4.2 The Four Equations of Backpropagation

#### 4.2.1 Equation 1: Finding the error of all nodes in the last layer

Lets take a neural network with L layers.

$$
\delta_{j}^{L} = \frac{\partial C}{\partial Z_{j}^{L}} = \frac{\partial C}{\partial a_{j}^{L}} \times\frac{\partial a_{j}^{L}}{\partial Z_{j}^{L}}
$$

Where $a^{L}_{j} = \sigma(Z^L_{j})$. So the second link to the chain is just the derivative of the activation function we choose to use.

$$
\delta_{j}^{L} = \frac{\partial C}{\partial a_{j}^{L}} \times\sigma'(Z^L_{j})
$$

This is now the error of the $j^{th}$ node of the $L^{th}$ layer. Let us vectorize this and write it down for the entire layer $L$, which has $J$ nodes.

$$
\delta^{L} = \begin{bmatrix} \frac{\partial C}{\partial a_{j}^{L}} \times\sigma'(Z^L_{1}) \\\frac{\partial C}{\partial a_{j}^{L}} \times\sigma'(Z^L_{2}) \\. \\. \\. \\\frac{\partial C}{\partial a_{j}^{L}} \times\sigma'(Z^L_{J})\end{bmatrix}
$$

On observing closely, This is just the gradient vector of the cost with respect to the activation of the $L^{th}$ layer multiplied with the derivative of the activation function of Z of that node.

$$
\delta^{L} = \nabla_{a^{L}} J . \sigma'(Z^L)
$$

This is possible to calculate for the last layer, because we already have the values of the expected outputs (The labels of the model). So we use this as the layer that comes after the last hidden layer and calculate the error of the Lth layer.

#### 4.2.2 Equation 2: Finding the error of any node

With this equation, if we know the error of the $(l+1)^{th}$ layer,$\delta^{l+1}$.  Then we can find the error of the $l^{th}$ layer, $\delta^l$.

$$
\delta^l = ((W^{l+1})^T \delta^{l+1}) . \sigma'(Z^l)
$$

That is, if we take the dot product of the weights matrix of the $(l+1)^{th}$ and its errors. Then we element wise multiply it with the derivative of the activation function of the $l^{th}$ layer, we get the $l^{th}$layer errors.

Keep in mind that:

- The weights matrix of a layer is of dimensions (input size x output size)
- The error of a layer is a vector of J elements (where J is the number of neurons in that layer)
- $\sigma'(Z^l)$ is a vector of J elements where J is the number of neurons in the layer.

Hence using this simple equation, we could just backpropagate and get the activations for all the layers.

#### 4.2.3 Equation 3: Finding the derivative of the cost w.r.t any bias

The derivative of cost with respect any bias is given by the:

$$
\delta^l = \frac{\partial C}{\partial b^l}
$$

Now we could just use the chain rule again to get this:

$$
\delta^l = \frac{\partial C}{\partial b^l} = \frac{\partial Z_{l}}{\partial b^l} \times \frac{\partial C}{\partial Z_{l}}
$$

But,

$$
\frac{\partial Z^l}{\partial b^l} = 1
$$

Hence,

$$
\delta^l = \frac{\partial C}{\partial Z_{l}}
$$

#### 4.2.4 Equation 4: Finding the derivative of the cost w.r.t any Weight

$$
\frac{\partial c}{\partial w_{jk}^l} = a^{l-1}_{k} . \delta^l_{j}
$$

For the derivation, let us take 2 layers. The $(l-1)^{th}$ and the $l^{th}$ layers. Let take the weight going from the $k^{th}$neuron to the $j^{th}$ neuron of the previous to the next layer respectively.

With the chain rule:

$$
\frac{\partial c}{\partial w_{jk}^l} = \frac{\partial Z^l_{j}}{\partial w_{jk}^l} \times \frac{\partial C}{\partial Z^l_{j}}
$$

The second term here is the error of the node. $\delta_{j}^l$

We only need the first term:

$$
\frac{\partial Z^l_{j}}{\partial w_{jk}^l}  = \frac{\partial}{\partial w_{jk}^l} (a^{l-1}_{1} . W^l_{1} + a^{l-1}_{2} . W^l_{2}+ \dots+a^{l-1}_{k} . W^l_{jk}) = a^{l-1}_{k}
$$

Putting all the pieces together we get:

$$
\frac{\partial c}{\partial w_{jk}^l} = a^{l-1}_{k} . \delta^l_{j}
$$

#### 4.2.5 Finding the derivative of the cost w.r.t any Weight VECTORIZED

Using the formula that we derived above, we can transform the weights matrix into a derivative.  
As we know, the weights matrix for a neural network which has $j$ neurons in the $l^{th}$ layer. and $k$neurons in the $(l-1)^{th}$ layer.

$$
W_{l} = \begin{bmatrix} W^l_{11}  & W^l_{12} & W^l_{13} & \dots & W^l_{1k} \\W^l_{21} & W^l_{22} & W^l_{23}  & \dots  & W^l_{2k} \\ .&.  &.  &  \dots  & .\\
W^l_{j1}  & W^l_{j2} & W^l_{j3}  & \dots  & W^l_{jk}\end{bmatrix}_{j \times k}
$$

Using the above formula, we get the element wise cost function derivation. Do not confuse this for matrix differentiation, which is completely different.

$$
\frac{\partial C}{\partial W^l_{jk}} = \begin{bmatrix} \delta_{1}^{l}\frac{\partial c}{\partial W^l_{11}}  & \delta_{1}^{l}\frac{\partial c}{\partial W^l_{12}} & \delta_{1}^{l}\frac{\partial c}{\partial W^l_{13}} & \dots & \delta_{1}^{l}\frac{\partial c}{\partial W^l_{1k}} \\\delta_{2}^{l}\frac{\partial c}{\partial W^l_{21}} & \delta_{2}^{l}\frac{\partial c}{\partial W^l_{22}} & \delta_{2}^{l}\frac{\partial c}{\partial W^l_{23}}  & \dots  & \delta_{2}^{l}\frac{\partial c}{\partial W^l_{2k}} \\ .&.  &.  &  \dots  & .\\
\delta_{k}^{l}\frac{\partial c}{\partial W^l_{j1}}  &\delta_{k}^{l} \frac{\partial c}{\partial W^l_{j2}} & \delta_{k}^{l}\frac{\partial c}{\partial W^l_{j3}}  & \dots  & \delta_{k}^{l}.\frac{\partial c}{\partial W^l_{jk}}\end{bmatrix}_{j \times k}
$$

But there is another way to show this, which includes the dot product of 2 vectors, but its slightly different, here's how:

$$
\delta^l = \begin{bmatrix}\delta^l_{1} \\\delta^l_{2}  \\. \\. \\. \\\delta^l_{j}    \end{bmatrix}_{j \times 1}
$$

$$
a^{l-1} = \begin{bmatrix}a^{l-1}_{1} \\a^{l-1}_{2} \\. \\. \\. \\a^{l-1}_{k}\end{bmatrix}_{k \times 1}
$$

Now multiply these such that you get a $(j \times k)$ matrix. You will get the same thing as above.

$$
(\delta^l)_{j \times 1} . (a^{l-1})^T_{1 \times k} = \begin{bmatrix} \delta_{1}^{l}\frac{\partial c}{\partial W^l_{11}}  & \delta_{1}^{l}\frac{\partial c}{\partial W^l_{12}} & \delta_{1}^{l}\frac{\partial c}{\partial W^l_{13}} & \dots & \delta_{1}^{l}\frac{\partial c}{\partial W^l_{1k}} \\\delta_{2}^{l}\frac{\partial c}{\partial W^l_{21}} & \delta_{2}^{l}\frac{\partial c}{\partial W^l_{22}} & \delta_{2}^{l}\frac{\partial c}{\partial W^l_{23}}  & \dots  & \delta_{2}^{l}\frac{\partial c}{\partial W^l_{2k}} \\ .&.  &.  &  \dots  & .\\
\delta_{k}^{l}\frac{\partial c}{\partial W^l_{j1}}  &\delta_{k}^{l} \frac{\partial c}{\partial W^l_{j2}} & \delta_{k}^{l}\frac{\partial c}{\partial W^l_{j3}}  & \dots  & \delta_{k}^{l}.\frac{\partial c}{\partial W^l_{jk}}\end{bmatrix}_{j \times k}
$$

So we could say:

$$
\frac{\partial C}{\partial W^l_{jk}} = (\delta^l)_{j \times 1} . (a^{l-1})^T_{1 \times k}
$$

### 4.3 Tying Part 3 and Part 4 together (The two ways of calculating derivatives)

We have derived 4 important formulae:  
From the feed-forward half:

$$
\frac{\partial J}{\partial W} =\begin{cases}  -\frac{1}{m}\sum_{i=0}^{i=m}(\hat{Y}-Z^l)^T .X, & \text{if } Z > 0 \\  0, & \text{otherwise}\end{cases}
$$

$$
\frac{\partial J}{\partial b} =\begin{cases}  -1 \sum_{i=1}^{i=M}( \hat{Y} -Z^l), & \text{if } Z > 0 \\  0, & \text{otherwise}\end{cases}
$$

From the backpropagation:

$$
\frac{\partial C}{\partial W^l_{jk}} = (\delta^l)_{j \times 1} . (a^{l-1})^T_{1 \times k}
$$

$$
\frac{\partial C}{\partial b^l} = \delta^l
$$

We also know that: we could just write

$$
e_{i} =  \hat{Y} - Z
$$

Hence, we could rewrite the feedforward half as:

$$
\frac{\partial J}{\partial W} =\begin{cases}  -\frac{1}{m}\sum_{i=0}^{i=m}(e_{i})^T .X, & \text{if } Z > 0 \\  0, & \text{otherwise}\end{cases}
$$

$$
\frac{\partial J}{\partial b} =\begin{cases}  -1 \sum_{i=1}^{i=M}( e_{i}), & \text{if } Z > 0 \\  0, & \text{otherwise}\end{cases}
$$

Now for the sake of simplicity, let us take just one training example:  
Hence:

$$
\frac{\partial J}{\partial W} = e_{i}.X^T
$$

$$
\frac{\partial J}{\partial b} = e_{i}
$$

Now do these ring a bell? They are the exact same formula we got for the backpropagation algorithm:

### 4.4 The Backpropagation Algorithm

**Backpropagation formulae:**

$$
\delta^L = \nabla_{a} J . \sigma'(Z^L)
$$

$$
\delta^l = ((W^{l+1})^T.\delta^{l+1}).\sigma'(Z^l)
$$

$$
\frac{\partial C}{\partial b^l} = \delta^l
$$

$$
\frac{\partial C}{\partial W^l_{jk}} = (\delta^l)_{j \times 1} . (a^{l-1})^T_{1 \times k}
$$

Here are the steps we follow in a neural network:

- During forward propagation, we calculate $a^L$s and $Z^l$s.
- Compute the cost
- Use the first formulae to get the error of the last layer. $\delta^L$
- Now use the second equation to get the rest of they layer's errors. $\delta^l$
- Use third equation to get the bias derivatives
- Use fourth equation to get the weight derivatives

Some other tips to build your NN:

- Each layer must also have a derivative of the weights matrix as shown above in section **4.2**
- Each layer must have a derivative of the biases vector as shown above
- Then make sure to concatenate these 2 vectors after flattening the weights vector. This gives you your $\theta$ vector
- Use this $\theta$ and apply gradient descent on it.

$$
\theta = \theta - \alpha \times \nabla_{W,b} J
$$

[Source](https://www.youtube.com/watch?v=Ixl3nykKG9M&t=24s)
