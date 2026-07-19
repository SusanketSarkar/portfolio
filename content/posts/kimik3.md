
When Moonshot released Kimi K2.5, it had already crossed the trillion-parameter mark. Simply making K3  larger wasn’t going to cut it, coz by now we’ve learned that scaling parameter count alone doesn’t guarantee better models. We’ve learned that parameter count alone is a poor predictor of capability. What matters is how efficiently a model converts additional compute into intelligence. Architecture, training strategy, and data quality increasingly determine whether additional parameters translate into meaningful performance gains. https://papers.neurips.cc/paper_files/paper/2022/file/c1e2faff6f588870935f114ebe04a3e5-Paper-Conference.pdf

Yet Kimi K3 delivers a surprisingly large jump in capability. Despite only a modest increase in scale relative to today’s largest MoE models, it closes much of the gap to frontier proprietary systems across reasoning, coding, and agentic tasks. The question isn’t *how did Moonshot build a bigger model?* It’s *how did they build a significantly better one?*

![The large jump between kimi k2.5 and kimi k3 suggests they did something right.](/portfolio/content/posts/kimik3/image1.png)

As MOE models grow deeper and sparser there are two things that begin to happen, 

- efficiently attending at long contexts
- and preserving signals as it propagates through many transformer layers

 Moonshots Kimi K3 solves both simultaneously at a scale no other open labs have tried, and heres how they did just that.

### Introduction

Scaaling large language models is not a matter of increasing param count anymore. Most MOE models today, are actually sparse (for Kimi k2.5 active vs total param count was 32B/1.04T, and for deepseek 4 it was 49B/1.6T). That is, while inference only a small amount of their total weights are actually activated and used for a given token during inference. This allows them to grow far bigger than their dense (here dense refers to the models that activate all tehir params per token during inference) counterparts. However, this introduces new optimization and systems challenges.

Problem #1: The first is **long context efficiency.** All transformer, and models that use attention suffer from this. It basically means that attention is a quadratically complex with repsect to sequece lemngth ($O(N^2)$), making it increasiungly computationally expensive as the context length grows.

Problem #2: The second is **signal degradation with depth**. As representations pass through layer after layer of transformations, useful information can gradually weaken or become distorted, making optimization harder and reducing the benefit of simply stacking more layers.

Kimi K3 introduces three key architectural components to address these challenges: **Kimi Delta Attention (KDA)** and **Multi-head Latent Attention (MLA)** for Problem 1  and **Attention Residuals (AttnRes)** for Problem 2.

### Kimi Delta Attention:

I would highly suggest you to read this paper https://arxiv.org/pdf/2510.26692 (it is a really well written paper covering all the maths), but if you are in a hurry, here is whats important to know about it.

The self attention, described in the famous “Attention is all you need” paper, is a computationally cotly mechanism which can be summarized by the following formula:

$$
\text{Attention}(Q,K,V) = \text{softmax}(QK^T)V
$$

Because the $QK^{T}$ dot-product yields an N × N matrix (where N is the sequence length), computing and storing this matrix scales quadratically. Linear Attention removes the softmax normalization 

$$
\text{LinearAttention}(Q,K,V) = QK^T V = Q(K^T V)
$$

By computing $(K^T V)$ first, the model reduces the intermediate matrix from a sequence-dependent N × N to a sequence-independent D × D space (where D is the embedding dimension). As a result, computation scales linearly $\mathcal{O}(N)$ rather than quadratically. 

But you may ask, was softmax redundant? that we can conviunientkly chuck it aside without a second thought? Actually no. Softmax acted as a hard filter and prevented dilution over long context. As we cannot just delete softmax without a thought, linear attention models use a mathematical trick called **Kernel Functions (φ)**. Instead of computing $\text{softmax}(QK^T)V$, they try to approximate it by transforming Q and K *before* multiplying them:

$$
\text{LinearAttention}(Q,K,V)=\phi (Q)\left(\phi (K)^{T}V\right)
$$

We use specialized feature maps for φ(⋅) to try to mimic softmax such as FAVOR+. Linear attention still has a problem. though, it uses a single fixed-size matrix $S$ that updates additively:

$$
S_{t}=S_{t-1}+k_{t}v_{t}^{T}
$$

It only adds information. Over long contexts, older and newer associations accumulate in the same fixed-size state, leading to interference and blurry memory. The **Gated Delta Net** added a time-based forget gate ($\alpha _{t}$) to this equation. This forces unused or irrelevant memories to naturally decay over time:

$$
S_{t}=\alpha _{t}(I-\beta _{t}k_{t}k_{t}^{T})S_{t-1}+\beta _{t}k_{t}v_{t}^{T}

$$

But the catch here is that , $\alpha _{t}$ is a coarse head-wise scalar. This means every single feature channel (e.g., all 128 dimensions in an attention head) is forced to forget at the exact same speed.

So the Kimi Delta Net inproved the GDA by utilizing a diagonalized matrix $\text{Diag}(\alpha_t)$, where 

$\alpha _{t}$ is a **vector**. So the equation becomes,

$$
S_{t}=(I-\beta_{t}k_{t}k_{t}^{T})\text{Diag}(\alpha _{t})S_{t-1}+\beta _{t}k_{t}v_{t}^{T}
$$

This fine-grained control allows individual channels within the same head to behave completely differently.

<img src="/portfolio/content/posts/kimik3/kda.png" style="display: block; margin: 0 auto; width: 400px;">
<p></p>
The mechanism of KDA depicted in a block diagram.

The gives us a recurrent attention mechanism that retains the linear-time complexity of linear attention while dramatically improving long-context memory through selective, feature-wise forgetting.

### Stable Latent Mixture of Experts

We know about how MOE (mixture of expert) models replace a dense feedforward layer with a layer which comprises of multiple smaller feed-forward layer per token and then have a router delegate a token to a subset to active experts. In doing that the input x is also first put through a down-projection, reducving the dimensions of the input and aiding to faster computation. This ia also why the process is called **latent** moe. The latent x is later up-projected into its original dimensions.

<img src="/portfolio/content/posts/kimik3/moe.png" style="display: block; margin: 0 auto; width: 500px;">
<p></p>

However, for K3 we face a unique challenge. The MOE is **sparse**. Lets look at the table below. Kimi K3 has the smallest layer sparsity ratio (around 1.8), compared to other moe models (and even its own previous version).
<table style="border: 1px solid #546a53; border-collapse: collapse; width: 100%;">
  <thead>
    <tr style="background-color: #5d625d;">
      <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Model</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: justify;">Active Experts (Per Token)</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: justify;">Total Experts (Per Layer)</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: justify;">Layer Sparsity Ratio (Active / Total)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>GPT-OSS 20B</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">4</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">32</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">12.50%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">GPT-OSS 120B</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">4</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">128</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">3.12%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">Qwen 3.5 (397B-A17B)</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">11 (10 routed + 1 shared)</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">512</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">2.15%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">Qwen 3.6 (35B-A3B)</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">9 (8 routed + 1 shared)</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">256</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">3.52%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">DeepSeek-V3</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">9 (8 routed + 1 shared)</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">257</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">3.50%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">DeepSeek-V4-Pro</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">16</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">256</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">6.25%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">DeepSeek-V4-Flash</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">~8</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">~128</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">6.25%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">Kimi K2.5</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">8</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">384</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">2.08%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">Kimi K2.6</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">9 (8 routed + 1 shared)</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">385</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">2.34%</td>
    </tr>
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;"><strong>Kimi K3</strong></td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">16</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;">896</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: justify;"><bold>1.79%</bold></td>
    </tr>
  </tbody>
</table>

<p></p>

At moderate sparsity, a slightly imperfect router isn’t a huge issue. If one expert receives 5% more tokens than another, the imbalance is still manageable. But at K3’s scale, where only **1.8% of experts are active**, even tiny routing biases compound rapidly. A handful of experts can become overloaded while many others receive almost no training, causing them to specialize poorly or even become effectively “dead.” Since every token depends on such a small subset of experts, routing quality becomes important.

Most modern MoE models combat this using **load-balancing losses** or auxiliary routing penalties. During training, these losses encourage the router to distribute tokens more evenly across experts.

The downside is that they introduce another delicate hyperparameter:

$$
L = L_{\text{task}} + \lambda L_{\text{balance}}
$$

If $\lambda$ is too small, experts collapse onto a few popular choices. If it’s too large, the router is forced to assign tokens to suboptimal experts simply to satisfy the balancing objective. Finding the right value often requires extensive tuning, and the optimal setting changes with model size, training stage, and data distribution.

Moonshot instead introduced **Quantile Balancing**, removing this balancing coefficient altogether.

Instead of manually encouraging balanced routing through an auxiliary loss, Quantile Balancing derives expert allocation directly from the **distribution of router scores**. Rather than asking *“How strongly does this token prefer Expert A?”*, it asks *“Where does this score rank relative to all other routing scores?”* Experts are then allocated according to these score quantiles instead of absolute score magnitudes.

Because routing decisions depend on relative rankings rather than fixed thresholds or manually weighted balancing losses, expert utilization naturally remains balanced without introducing another sensitive hyperparameter to tune. The router still sends tokens to the experts it prefers, but avoids the pathological collapse where a few experts dominate training.

Stable routing alone, however, isn’t enough. Training a trillion-parameter MoE with nearly 900 experts introduces additional optimization challenges.

To support this extreme sparsity, Moonshot paired Stable Latent MoE with two optimization techniques.

The first is **Per-Head Muon**, a variant of the Muon optimizer that applies matrix orthogonalization independently to different attention heads. This improves optimization stability and helps maintain well-conditioned weight updates in very deep transformers.

The second is **SiLU-Transferred Initialization (SiTU)**, an initialization strategy designed specifically for SiLU-based networks. It preserves activation statistics across extremely deep models, reducing gradient instability during the early stages of training.

Neither of these techniques changes the model architecture itself. Instead, they serve as supporting infrastructure that keeps optimization stable while training an MoE operating at such an extreme level of sparsity.

### Attention Residual

> I have written a detailed blog on this topic that covers the maths, implementations and benchmarks, in depth. You can giv it a read here: https://medium.com/@susanketsarkar1140/attention-residuals-explained-6fa848e74db8 Here I will just focus on the intuition alone.
> 

Every transformer layer follows the same basic update:

$h_l = h_{l-1} + f(h_{l-1})$

which is depicted in this diagram.

<img src="/portfolio/content/posts/kimik3/ar1.png" style="display: block; margin: 0 auto; width: 300px;">
<p></p>

The shortcut allows gradients to flow through very deep networks, making modern LLMs possible. However, it also introduces a subtle limitation.

When this equation is expanded across many layers, the hidden state becomes

$$
h_l = f(h_{l-1}) + h_{l-1} = v_L + h_{l-1} + f(\dots)
 = h_0 + v_1 + v_2 + \cdots + v_l
$$

where every previous layer contributes **equally** to the final representation.

This works well for moderately deep models, but as transformers grow to hundreds of layers and trillions of parameters, the residual stream continuously accumulates information. Earlier representations become diluted among hundreds of equally weighted additions, forcing deeper layers to produce increasingly larger outputs simply to remain influential. The model ends up passively inheriting everything from its past, even when most of that information is no longer useful.

Moonshot’s key observation is that **depth behaves much like a sequence**.

Just as transformers replaced the fixed recurrence of RNNs with attention over previous tokens, Attention Residuals replace fixed residual accumulation with **attention over previous layer outputs**.

Instead of always inheriting every previous representation,

$$
h_l=h_{l-1}+f(h_{l-1}),
$$

each layer learns to **retrieve** only the representations it actually needs:

$$
h_l=\sum_i \alpha_{i\rightarrow l}v_i
$$

where $v_i$ are outputs from previous layers (or blocks), and $\alpha_{i\rightarrow l}$ are **learned attention weights** that determine how much information to retrieve from each one.

Rather than passively carrying forward the entire history, a layer can selectively reach back to early representations when needed while largely ignoring irrelevant intermediate computations. In other words, residual connections become a **retrieval mechanism** instead of a fixed accumulation mechanism.

<img src="/portfolio/content/posts/kimik3/ar2.png" style="display: block; margin: 0 auto; width: 500px;">
<p></p>

Because storing every layer output would be prohibitively expensive, Kimi K3 uses **Block Attention Residuals**, grouping neighboring layers into a handful of blocks and attending over block summaries instead of every individual layer. This preserves most of the benefits while keeping both memory usage and inference overhead low.

### Training and Serving Tricks

So far I’ve talked about what an architechtural feat K3 was compared to other SOTA and K2.5, but clever architechture is only part of its sucess. They also need an efficient way to train and serve it.

> One of the first things that stood out to me was that Moonshot didn’t train K3 in full precision and quantise it afterwards.
> 

Instead their workflow looked like this:

<img src="/portfolio/content/posts/kimik3/mxpf.png" style="display: block; margin: 0 auto; width: 300px;">
<p></p>

The model is already trained in mixed precision and hence it does not require post-hoc quantisation to be deployed. 

> In other words, the model learns to operate under the same numerical constraints it will experience in production.
> 

Additionally, training a Mixture-of-Experts model isn’t just expensive because of the number of parameters. Every token needs to be routed to experts that often live on the **different GPUs that their experts live on**.

<img src="/portfolio/content/posts/kimik3/tokengpu.png" style="display: block; margin: 0 auto; width: 300px;">
<p></p>

Instead of relying on dynamic tensor shapes and frequent CPU synchronization to determine where tokens should go, Moonshot redesigned the routing pipeline around **static communication patterns** with **no host synchronization** during execution.

<img src="/portfolio/content/posts/kimik3/expertparallel.png" style="display: block; margin: 0 auto; width: 600px;">
<p></p>

Removing these synchronization points keeps GPUs busy instead of waiting for the CPU to coordinate communication. It doesn’t make the model smarter exactly, but it does help it waste less hardware.

> Moving on, my two cents on this is, “open weights” doesnt actually mean easy to run or deploy, even after the numerous optimizations that they did on the model.
> 

Moonshot is honest about this. The blog recommends “deploying Kimi K3 on supernode configurations with 64 or more accelerators”, connected through high bandwidth interconnects. Even though it actuvates only 16 out of around 900 experts these 16 could be distributed in any gpus and a fast tech like NVLink becomes kind of a necessity.

### Finally, Does it work?

All of the architechture changes mentioned above does work, yes, but like most of thefrontier models today its not universally the best but has its own strengths.

#### is it good at coding?

Arguably the best, and it ties with GPT Sol and Fable 5.

![](/portfolio/content/posts/kimik3/coding.png)

 That being said I did read a lot of reddit posts complaining thats its token hungy (compared to Sol).

#### Does it make a good agent?

This is where it is the best. 

![](/portfolio/content/posts/kimik3/agentic.png)

That being said what is really impresive is its, cost per task chart. It is better than most but costs around the same as GPT Terra.

<img src="/portfolio/content/posts/kimik3/svc.png" style="display: block; margin: 0 auto; width: 500px;">
<p></p>

### Show, Dont tell

Rather than just looking at the benchmarks, here are some results that genuinely made me think.

1. Moonshot dropped it into a sandbox and gave it **24 hours** to profile, rewrite and optimize GPU kernels used in K3 itself, including kernels for **KDA**, **Attention Residuals**, and **MLA**.
    
    K3 wrote an MLA kernel that achieved **517.8 TFLOPS** (forward + backward) on an NVIDIA H200, over **50% of the theoretical BF16 peak throughput** of the hardware.
    
    <img src="/portfolio/content/posts/kimik3/mla.png" style="display: block; margin: 0 auto; width: 500px;">
<p></p>
    
2. It built an entire GPU compiler. K3 developed MiniTriton (its a lightweight Triton-like GPU compiler) from scartch.
    
    That meant building, a DSL frontend, an intermediate representation (IR), optimisation passes, runtime execution, and validating everything by training a real neural network.
    
    <img src="/portfolio/content/posts/kimik3/minitriton.png" style="display: block; margin: 0 auto; width: 500px;">
<p></p>
    
3. One thing I really like is their Vision in the loop idea. It is a simple workflow that means, instaed of generating code blindly it first writes code runs program, gets a screenshot, and see what it did wrong and modify the code accordingly.
    
    <img src="/portfolio/content/posts/kimik3/visionloop.png" style="display: block; margin: 0 auto; width: 500px;">
<p></p>
    
Not sure if any of the frontier models already do this but I think its really interesting.
    
4. What blew my mind the most was a demo where K3 created a **3Blue1Brown-style animated explainer of the concept of quantile balancing, and its actually makes the concept pretty clear**. Heres the video, incase you’re interested.
<video controls style="display: block; margin: 0 auto; width: 500px;">
  <source src="/portfolio/content/posts/kimik3/quantbal.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>


