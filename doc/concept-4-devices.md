# Concept 4 device results

9 races from 3 phone and mode combinations. Medians per phone. Pass = average fps ≥ 50, p95 frame ≤ 25 ms, frames over 34 ms ≤ 2%.

| Phone | Mode | Runs | Avg fps | p95 ms | Worst ms | >34 ms % | Worst frame after a Boost ms | fps drop (first vs last 5 s) | Finish avg fps | Finish worst ms | Stress: fps lost, first vs last races | Battery % used | Tap to frame ms (avg / worst) | JS heap growth MB | Pass |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Test laptop (Linux headless) | auto | 3 | 24.1 | 100.0 | 100.0 | 33.6 | 100.0 | 26.4 | – | – | – | – | – / – | -0.9 | **no** |
| (no name) | auto | 3 | 60.0 | 16.9 | 17.8 | 0.0 | 17.0 | 0.4 | – | – | – | – | – / – | 0.1 | yes |
| K, Android 10 | auto | 3 | 60.1 | 16.7 | 16.8 | 0.0 | 16.8 | 0.2 | – | – | – | – | – / – | 0.0 | yes |

## Device details

| Phone | GPU | Screen Hz | Render resolution | Mpx | Cores | Memory GB | Build |
|---|---|---|---|---|---|---|---|
| Test laptop (Linux headless) | ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) | 15 | 1 | 0.305 | 8 | 16 | e499beb |
| (no name) | ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11) | 45 | 1 | 1.814 | 8 | 32 | 72d62aa |
| K, Android 10 | ANGLE (Qualcomm, Adreno (TM) 710, OpenGL ES 3.2) | 55 | 2 | 1.234 | 8 | 8 | 72d62aa |

Tap time is only measured in PLAY mode. Finish = the win finish alone. Stress rows come from the STRESS ×10 button. Battery is only reported by Chromium browsers. Long-task counts are only available in Chromium browsers; Safari reports none.
