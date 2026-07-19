![header](/content/posts/attnres/header.jpeg)
## What’s a residual?

When you stack layers in a neural network, you need gradients to flow backward so the model can learn. Residual connections — introduced by He et al. in 2015 — solved the "vanishing gradient" problem by adding a shortcut: instead of just passing your input through a transformation, you also add the original input back.

Formally: `h_l = h_{l-1} + f(h_{l-1})`

h_l = h_{l-1} + f(h_{l-1})

But here's what that equation actually says when you unroll it across all layers:

> Every layer receives the **sum of every previous layer's output**, with equal weight on all of them.

Layer 1's output counts the same as layer 20's output. The embedding counts the same as the last attention block. No layer can say "I care more about what layer 5 did than layer 15." The weights are fixed. They're all just 1.

This creates a problem called **PreNorm dilution**.

----------

## The dilution problem

Pre LayerNorm (commonly called PreNorm) lets you normalize the hidden state before passing it into each layer. Lets imagine no LayerNorm:

$x_{l+1} = x_l + F(x_l)$

This will mean some layer outputs have huge values while other layers have tiny outputs. So essentially a few layers dominate while others barely matter. Nowif we add layer norm:

$x_{l+1} = x_l + F(\text{LN}(x_l))$

This forces the input to each layer to have the same mean and variance. So $F(.)$ always sees normalized inputs.

This keeps training _stable_.

But it has a side effect: because you keep adding layer outputs together which are all of comparable size, the magnitude of the hidden state grows with depth. As the model gets deeper, each individual layer's contribution becomes a smaller and smaller fraction of the total.

We effectively get:

$x_{l+1} = x_l + (\text{something of similar size})$

$x_L = x_0 + v_1 + v_2 + v_3 + \dots + v_L$ where each $v_i$ has similar magnitude

The Kimi paper shows this empirically. In their baseline model, the output magnitude of each transformer block grows monotonically as you go deeper. The model compensates by making deeper layers produce larger and larger outputs just to stay relevant — which wastes capacity and hurts gradient flow.

The gradient problem is also real. When all residual weights are fixed at 1, the model can't regulate how gradients flow back through depth. Early layers end up with disproportionately large gradients. This isn't catastrophic — models still train — but it's inefficient.

And there's a third issue: once information gets mixed into the accumulated residual sum, you can't get it back. If layer 4 computed something useful and layer 15 needs it specifically, there's no clean way to retrieve it. It's been averaged into everything that came after.

----------

## The insight: depth is just another sequence

Here's where the paper gets interesting.

The authors draw a parallel that's actually quite neat. Consider how recurrent neural networks (RNNs) work over a sequence of tokens: each step compresses everything it's seen into a single hidden state and passes it forward. RNNs were great but had a fundamental limitation — earlier tokens got buried under later ones, and you couldn't selectively retrieve them.

In RNNS,

$y_i = g(h_i)$ where $h_i = f(h_{i-1}, x_i)$

So the information path from x_j to y_i is :

$x_j \rightarrow h_j \rightarrow h_{j+1} \rightarrow \dots \rightarrow h_i \rightarrow y_i$

Transformers fixed this for sequences by replacing the recurrence with **attention**. Instead of passing a single compressed state of all the history, attention lets every position look directly at every previous position, with learned weights that depend on the content.

Attention is: $y_i = \sum_{j} \alpha_{ij} v_j$ where $\alpha_{ij} = \frac{\exp\left(\frac{q_i \cdot k_j}{\sqrt{d}}\right)}{\sum_{m=1}^{T} \exp\left(\frac{q_i \cdot k_m}{\sqrt{d}}\right)}$.

So the information path is:

$x_j \rightarrow v_j \rightarrow y_i$

Each token $x_j$ gets its own representation $v_j$, nothing is forced into a single bottleneck like $h_j$. The key insight was that _you don't have to compress; you can just attend._

The Kimi paper says: the same problem exists along the depth axis.

Each layer in a deep network is like a timestep in an RNN — it processes information and passes a compressed state forward. Standard residuals are depth-wise recurrence. And just like sequence modeling, you can replace that recurrence with direct attention.

They call this **Attention Residuals (AttnRes)**.

----------

## How Attention Residuals work?

The core idea is simple. Instead of:

$h_l = h_{l-1} + f(h_{l-1})$

...which gives equal weight to everything, you compute:

$h_l = Σ α_{i→l} · v_i$

Where:

-   `$v_i$` are the outputs of all previous layers (plus the token embedding)
-   `$α_{i→l}$` are attention weights that sum to 1
-   The weights are computed using a small learned vector `$w_l$` per layer (the "query")

So each layer has its own query vector, and it uses that to decide how much to weight each previous layer's output. A layer that needs early-stage syntactic information can weight layer 2 heavily. A layer doing high-level reasoning can focus on the last few transformer blocks. The weights are input-dependent, meaning they can change based on what's actually in the sequence, not just what layer you're at.

The key/value pairs are just the layer outputs themselves. The RMSNorm inside the attention function prevents any single layer with unusually large outputs from dominating.

This is literally just **softmax attention**, but applied across depth instead of across the sequence. The authors call it "depth-wise softmax attention" and show that standard residual connections are actually a special case — they correspond to depth-wise attention where every weight is equal.

----------

## The memory problem (and how they solved it)

There's an obvious practical issue. Full AttnRes requires storing every layer's output so any subsequent layer can attend to it. For a model with 128 layers and hidden dimension 7168 (like large MoE models), that's a lot of memory.

In small-scale training, this is fine — you're already keeping those activations around for backpropagation anyway. But at scale, two things happen:

1.  **Activation recomputation**: Large models typically discard intermediate activations during the forward pass and recompute them during the backward pass to save memory. AttnRes breaks this — you can't discard outputs other layers need.
2.  **Pipeline parallelism**: When you split a model across multiple GPUs using pipeline parallelism, every layer output now needs to be transmitted across GPU boundaries. With 128 layers and O(Ld) communication cost, this gets expensive fast.

The solution is **Block AttnRes**.

Instead of letting every layer attend to every previous layer individually, you partition the layers into N blocks (around **8** in practice). Within each block, layer outputs are summed together using standard residual connections. Across blocks, you apply attention over these N block-level summaries plus the token embedding.

This reduces memory from O(Ld) to O(Nd). With N=8, you're storing 8 vectors instead of 128. Communication overhead drops by the same factor.

The paper shows this works surprisingly well. N≈8 captures most of the benefit of full AttnRes. The performance gap between Full and Block AttnRes actually shrinks as model size increases.

----------

## The infrastructure tricks

Getting Block AttnRes to work efficiently at scale required two more engineering solutions.

**Cross-stage caching.** In pipeline parallel training, each GPU handles multiple "virtual stages." Without caching, each stage transition would need to transmit the full history of block representations — which grows quadratically with pipeline depth. The fix: each GPU caches the block representations it received in earlier virtual stages. When a new stage starts, you only need to transmit the _new_ blocks since last time. This reduces peak communication cost from O(C) to O(P) where C is total chunks and P is physical pipeline stages — a V× improvement where V is the number of virtual stages.

This diagram shows the fix visually. With 4 GPUs and 2 virtual stages each, the naive approach would re-send the full block history at every stage transition. With caching, each GPU remembers what it already received. At Virtual Stage 1, instead of sending `[b0, b1, b2]` again, you only send the new blocks `+[b1, b2]`. Six redundant transmissions eliminated.

**Two-phase computation at inference.** At inference time, the attention over block representations has to happen at every single layer. A naive implementation would re-read all N block vectors for every layer — wasteful. The fix exploits a key property: the query vector `w_l` for each layer is a learned parameter that doesn't depend on the input. So within a block of S layers, all S queries are known in advance. You can batch them into a single matrix multiplication against the block key-value store (Phase 1). Then for intra-block dependencies, you handle those sequentially (Phase 2), merging results using online softmax. This brings per-layer memory access cost to roughly 5.5d reads and 2d writes — compared to 34d for their main competitor (mHC) and 3d for standard residuals. The inference latency overhead ends up under 2%.

----------

## What the results actually show

The paper tests AttnRes at multiple model sizes, fitting scaling law curves to compare compute efficiency.

The baseline follows: `$L = 1.891 × C^{-0.057}$`

Block AttnRes follows: `$L = 1.870 × C^{-0.058}$`

Both have almost the same slope, meaning AttnRes doesn't change _how_ models scale — it just shifts the curve down. At 5.6 PFLOP/s-days of compute, Block AttnRes reaches a validation loss of 1.692 versus the baseline's 1.714. The paper frames this as a **1.25× compute advantage** — you'd need 25% more compute with standard residuals to match Block AttnRes.

For their large model — a 48B parameter MoE architecture pre-trained on 1.4 trillion tokens — the downstream benchmark results are clean:

-   GPQA-Diamond: 36.9 → 44.4 (+7.5)
-   Math: 53.5 → 57.1 (+3.6)
-   HumanEval: 59.1 → 62.2 (+3.1)
-   MMLU: 73.5 → 74.6 (+1.1)
-   BBH: 76.3 → 78.0 (+1.7)

Block AttnRes wins on every single benchmark. The gains are biggest on multi-step reasoning and code — which makes sense, since those tasks most benefit from a model being able to selectively retrieve earlier intermediate representations.

The training dynamics tell the story clearly too. In the baseline, output magnitudes grow monotonically with depth — the dilution problem showing up visually. With Block AttnRes, growth is contained within each block and resets at block boundaries, giving a periodic bounded pattern. Gradient magnitudes are also much more uniform across depth.

----------

## What the model actually learns to attend to

The paper includes an interesting visualization: heatmaps showing the learned attention weights across depth, for both full and block variants.

Three patterns show up:

**Locality dominates.** Each layer attends most strongly to its immediate predecessor. The diagonal is bright. This makes sense — most of the time, the most relevant context is the previous layer.

**The embedding stays relevant.** The token embedding (source 0) retains non-trivial weight throughout training, especially before attention layers. This suggests that raw input features remain useful even in very deep layers.

**Skip connections emerge.** Off-diagonal concentrations appear — layer 4 attending to early sources, layers 15-16 reaching far back. These aren't explicitly programmed. The model learned them. This is effectively learned skip connections, more flexible than the fixed shortcuts you'd design by hand.

The block variant shows the same patterns with sharper, more decisive weights. Block-wise compression acts as a kind of regularization, forcing the model to commit more clearly to which sources matter.

----------

## How it compares to alternatives

The paper positions AttnRes against several existing approaches:

**DenseFormer** gives each layer access to all previous outputs, but uses fixed scalar weights that don't depend on the input. It shows essentially no improvement over the baseline (1.767 vs 1.766 loss). This directly proves the point: cross-layer access alone isn't enough — you need input-dependent weights.

**mHC (manifold-constrained hyper-connections)** maintains multiple parallel streams with learned mixing matrices, achieving 1.747. It's input-dependent, which helps. But it uses much more memory per layer (34d I/O vs 5.5d for Block AttnRes) and is more complex.

**AttnRes** gets to 1.737 (full) / 1.746 (block) with a single d-dimensional query vector per layer. Better performance, less memory, simpler design.

There's also an ablation on the query itself: if you make the query input-dependent (projecting from the hidden state), _loss drops to 1.731_. But this adds a d×d projection per layer and breaks the batching trick during decoding. The paper keeps the simpler learned query as default.

----------

## The bigger picture

The paper has a theoretical framing that's worth noting. The authors show that standard residual connections, Highway networks, and mHC can all be viewed as instances of **depth-wise linear attention** — they're all just different parameterizations of a weighted sum over previous layer outputs where the weights factor in certain structured ways.

AttnRes completes the picture by doing depth-wise _softmax_ attention. The analogy to sequence modeling is exact: linear attention (fast but limited) → softmax attention (more expressive). The same transition that made Transformers better than RNNs over sequences, applied to depth.

One more finding worth mentioning: AttnRes shifts the optimal model architecture slightly. Lets look at this image:

The x axis for both (a) and (b) is $d_{model}/L_b$ which denotes how wide vs. deep the model is. higher number is wider and shallower. Lower is narrower and deeper.

The y axis for both is $H/L_b$ is how many attention heads the model has per layer. Lower is fewer heads.

They tested 25 combinations with both baseline residuals and attention residuals and noted the best ($d_{model}/L_b$, $H/L_b$) set that gets the lowest Loss (Red cell denotes high loss and Blue cells denote lower loss). They highlighted the best combination with a star for both cases, and found that for the attention residuals the best configuration shifts to the left (the best configuration is deeper than baseline case). Because AttnRes makes each layer's output more accessible to future layers, you can afford to use more of them — depth becomes more valuable. The authors are careful to note this doesn't mean deeper is always better for deployment (sequential depth increases latency), but it shows AttnRes do change how the model uses depth.

----------

This is the most theoretical part of the paper, but the visual makes it intuitive. Each matrix shows how much weight layer _l_ (rows) gives to previous layer outputs (columns). Standard residuals: all 1s, no choice. Highway: products of learned gates, but still just recurrence. Full AttnRes: every entry is independently computed from a query-key dot product — a dense, flexible matrix. Block AttnRes: layers within the same block share a key, so whole columns collapse into one entry. It's a strict generalization. Standard residuals are just the special case where all weights happen to be equal.

## What this means practically

Residual connections are in every model. They've been there since 2015. The assumption that you just add layer outputs with equal weight has been so basic nobody questioned it much.

The Kimi paper says: _that assumption is wrong, and you can do better with essentially the same compute._

The practical version — Block AttnRes with ~8 blocks — adds less than **4%** training overhead under pipeline parallelism, less than **2%** inference latency, and a negligible parameter count (one RMSNorm and one d-dimensional vector per layer). The gains compound across every benchmark tested.

If the results hold across more architectures and training regimes, this could become the new standard. Like how PreNorm replaced PostNorm. Like how RoPE replaced learned positional embeddings.

The code is open-sourced at [github.com/MoonshotAI/Attention-Residuals](https://github.com/MoonshotAI/Attention-Residuals). The paper is on arXiv: [2603.15031.](https://arxiv.org/pdf/2603.15031)
