import csv
import math
from pathlib import Path

import matplotlib.pyplot as plt


OUT_DIR = Path("/root/pitzDaily-viz")


def read_csv(path):
    with path.open() as handle:
        reader = csv.DictReader(handle)
        return list(reader)


def first_key(keys, candidates):
    for candidate in candidates:
        if candidate in keys:
            return candidate
    raise KeyError(f"Missing expected columns. Available: {sorted(keys)}")


def make_velocity_profile():
    rows = read_csv(OUT_DIR / "velocity_profile_x001.csv")
    keys = rows[0].keys()

    y_key = first_key(keys, ["Points:1", "Points_Y", "Point_Y"])
    ux_key = first_key(keys, ["U:0", "U_X"])
    uy_key = first_key(keys, ["U:1", "U_Y"])
    uz_key = first_key(keys, ["U:2", "U_Z"])

    y = [float(row[y_key]) for row in rows]
    ux = [float(row[ux_key]) for row in rows]
    umag = [
        math.sqrt(float(row[ux_key]) ** 2 + float(row[uy_key]) ** 2 + float(row[uz_key]) ** 2)
        for row in rows
    ]

    plt.figure(figsize=(8, 5))
    plt.plot(ux, y, label="Ux")
    plt.plot(umag, y, label="|U|", linestyle="--")
    plt.xlabel("Velocity (m/s)")
    plt.ylabel("y (m)")
    plt.title("Velocity Profile at x = 0.01 m")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUT_DIR / "velocity_profile_x001.png", dpi=180)
    plt.close()


def make_centerline_pressure():
    rows = read_csv(OUT_DIR / "centerline_pressure.csv")
    keys = rows[0].keys()

    x_key = first_key(keys, ["Points:0", "Points_X", "Point_X"])
    p_key = first_key(keys, ["p", "p_Magnitude"])

    x = [float(row[x_key]) for row in rows]
    p = [float(row[p_key]) for row in rows]

    plt.figure(figsize=(8, 5))
    plt.plot(x, p, color="#cc3d3d")
    plt.xlabel("x (m)")
    plt.ylabel("Pressure")
    plt.title("Centerline Pressure Along the Channel")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(OUT_DIR / "centerline_pressure.png", dpi=180)
    plt.close()


def main():
    make_velocity_profile()
    make_centerline_pressure()


if __name__ == "__main__":
    main()
