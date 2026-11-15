"""Optional PyTorch training path with a CPU fallback."""

from __future__ import annotations

from pathlib import Path

import numpy as np

from hardware_runtime import RuntimeConfig, adaptive_batch


def train_autoencoder(
    values: np.ndarray,
    output: str | Path,
    config: RuntimeConfig,
    *,
    epochs: int = 5,
    accumulation_steps: int = 2,
) -> Path:
    """Train a compact autoencoder with AMP and adaptive batches when Torch exists."""
    try:
        import torch
        from torch import nn
        from torch.utils.data import DataLoader, TensorDataset
    except ImportError as error:
        raise RuntimeError("Install the optional GPU extra to use the neural path") from error

    device = torch.device(
        f"cuda:{config.gpu_device}" if config.gpu_enabled and torch.cuda.is_available() else "cpu"
    )
    tensor = torch.as_tensor(values, dtype=torch.float32)
    dataset = TensorDataset(tensor)
    workers = config.workers if device.type == "cuda" else min(2, config.workers)
    hidden = max(8, tensor.shape[1] // 2)
    model = nn.Sequential(nn.Linear(tensor.shape[1], hidden), nn.ReLU(), nn.Linear(hidden, tensor.shape[1])).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")

    def run(current_batch: int) -> None:
        loader_options = {
            "batch_size": current_batch,
            "shuffle": True,
            "num_workers": workers,
            "pin_memory": config.pin_memory and device.type == "cuda",
            "persistent_workers": config.persistent_workers and workers > 0,
        }
        if workers > 0:
            loader_options["prefetch_factor"] = config.prefetch_factor
        loader = DataLoader(dataset, **loader_options)
        model.train()
        for _ in range(epochs):
            optimizer.zero_grad(set_to_none=True)
            for step, (batch,) in enumerate(loader):
                batch = batch.to(device, non_blocking=True)
                with torch.autocast(device_type=device.type, dtype=torch.float16, enabled=device.type == "cuda"):
                    loss = ((model(batch) - batch) ** 2).mean() / accumulation_steps
                scaler.scale(loss).backward()
                if (step + 1) % accumulation_steps == 0:
                    scaler.step(optimizer)
                    scaler.update()
                    optimizer.zero_grad(set_to_none=True)

    _, batch_size = adaptive_batch(run, config.batch_size)
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"model": model.state_dict(), "batch_size": batch_size}, output)
    if device.type == "cuda":
        torch.cuda.empty_cache()
    return output
