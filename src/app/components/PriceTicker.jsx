"use client";

import { useEffect, useState } from "react";
import { toBanglaNumber } from "./priceUtils";

const API_URL = "/api/products";

// আগের টিকারে ৫টি পণ্য ২৫ সেকেন্ডে ঘুরত (প্রতি পণ্য ~৫ সেকেন্ড)।
// পণ্য সংখ্যা বাড়লে একই গতি ধরে রাখতে duration আনুপাতিকভাবে বাড়ানো হয়।
const BASE_ITEM_COUNT = 5;
const BASE_DURATION = 25;

const UNIT_LABELS = {
    kg: "কেজি",
    litre: "লিটার",
    liter: "লিটার",
    l: "লিটার",
    dozen: "ডজন",
    piece: "পিস",
    pcs: "পিস",
};

// API response বিভিন্ন shape-এ আসতে পারে, তাই সবগুলো tolerate করা হয়
function toProductList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.products)) {
        return data.products;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    if (Array.isArray(data?.data?.products)) {
        return data.data.products;
    }

    return [];
}

function getProductPrice(product) {
    const value =
        product?.today ??
        product?.price ??
        product?.todayPrice ??
        product?.today_price ??
        product?.currentPrice ??
        product?.current_price;

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        !Number.isFinite(Number(value))
    ) {
        return null;
    }

    return Number(value);
}

function getUnit(unit) {
    const key = String(unit || "").trim().toLowerCase();

    if (!key) {
        return "";
    }

    return UNIT_LABELS[key] || String(unit);
}

function formatPrice(product) {
    const price = getProductPrice(product);

    if (price === null) {
        return "দাম পাওয়া যায়নি";
    }

    const formatted = toBanglaNumber(
        price.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    );
    const unit = getUnit(product?.unit);

    return unit ? `${formatted} টাকা/${unit}` : `${formatted} টাকা`;
}

// direction শুধু up/down হলেই arrow+percentage দেখানো হয়,
// flat বা অসম্পূর্ণ change ডেটা বাদ দেওয়া হয়।
function getChange(change) {
    const direction = change?.dir;
    const pct = Number(change?.pct);

    if (
        (direction !== "up" && direction !== "down") ||
        !Number.isFinite(pct)
    ) {
        return null;
    }

    return {
        direction,
        label: `${toBanglaNumber(
            Number(Math.abs(pct).toFixed(1))
        )}%`,
    };
}

function TickerMessage({ icon, children }) {
    return (
        <div
            className="price-ticker-wrapper"
            aria-label="বাজারদরের আপডেট"
        >
            <div className="price-ticker-group">
                <div className="price-item">
                    <span className="price-icon">{icon}</span>
                    <span className="price-name">{children}</span>
                </div>
            </div>
        </div>
    );
}

export default function PriceTicker() {
    const [products, setProducts] = useState([]);
    const [status, setStatus] = useState("loading");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchProducts() {
            try {
                const response = await fetch(API_URL, {
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error("পণ্যের তথ্য লোড করা যায়নি।");
                }

                const data = await response.json();

                if (controller.signal.aborted) {
                    return;
                }

                setProducts(toProductList(data));
                setStatus("ready");
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                setProducts([]);
                setStatus("error");
            }
        }

        fetchProducts();

        return () => controller.abort();
    }, []);

    if (status === "loading") {
        return <TickerMessage icon="⏳">বাজারদর লোড হচ্ছে...</TickerMessage>;
    }

    if (status === "error") {
        return (
            <TickerMessage icon="⚠️">
                বাজারদর লোড করা যায়নি
            </TickerMessage>
        );
    }

    const items = products.map((product, index) => ({
        key: `${product?.slug || product?.id || "product"}-${index}`,
        icon: product?.image || product?.categoryIcon || "🛒",
        name: product?.nameBn || product?.name || "পণ্য",
        price: formatPrice(product),
        change: getChange(product?.change),
    }));

    if (items.length === 0) {
        return <TickerMessage icon="🛒">দাম পাওয়া যায়নি</TickerMessage>;
    }

    const duration = BASE_DURATION * Math.max(1, items.length / BASE_ITEM_COUNT);

    return (
        <div
            className="price-ticker-wrapper"
            aria-label="বাজারদরের আপডেট"
        >
            <div
                className="price-ticker-track"
                style={{ animationDuration: `${duration}s` }}
            >
                {[0, 1].map((group) => (
                    <div
                        className="price-ticker-group"
                        key={group}
                        aria-hidden={group === 1 ? "true" : undefined}
                    >
                        {items.map((item) => (
                            <div className="price-item" key={item.key}>
                                <span className="price-icon">
                                    {item.icon}
                                </span>

                                <span className="price-name">
                                    {item.name}
                                </span>

                                <span className="price-value">
                                    {item.price}
                                </span>

                                {item.change && (
                                    <span
                                        className={
                                            item.change.direction === "up"
                                                ? "price-up"
                                                : "price-down"
                                        }
                                    >
                                        {item.change.direction === "up"
                                            ? "▲"
                                            : "▼"}{" "}
                                        {item.change.label}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
