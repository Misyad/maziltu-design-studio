import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PhysicalKtaCard } from "@/features/dashboard/physical-kta-card";
import type { KtaCard } from "@/types/api";

const card: KtaCard = {
  id_users: 9,
  id_anggota: "0174011119",
  nama: "Achmad Hasanudin",
  alamat: "Jl. Contoh No. 10, Malang",
  niqobah: "Pakis",
  tahun_masuk: "2011",
  tahun_keluar: "2019",
  foto: "image/anggota/member.jpg",
  barcode_value: "0174011119",
  barcode_data_uri: "data:image/svg+xml;base64,PHN2Zy8+",
  background_url: "https://example.test/assets/kta.jpg",
};

describe("PhysicalKtaCard", () => {
  afterEach(() => cleanup());

  it("renders the printable member identity and backend-generated barcode", () => {
    render(<PhysicalKtaCard card={card} />);

    const preview = screen.getByTestId("physical-kta-card");
    expect(preview).toHaveClass("kta-card");
    expect(preview.querySelector(".kta-card__background")).toHaveAttribute(
      "src",
      card.background_url,
    );
    expect(screen.getByText("Achmad Hasanudin")).toBeInTheDocument();
    expect(screen.getAllByText("0174011119")).toHaveLength(1);
    expect(screen.getByText("Jl. Contoh No. 10, Malang")).toBeInTheDocument();
    expect(screen.getByText("2011")).toBeInTheDocument();
    expect(screen.getByText("2019")).toBeInTheDocument();
    expect(screen.getByAltText("Barcode anggota 0174011119")).toHaveAttribute(
      "src",
      card.barcode_data_uri,
    );
    expect(screen.getByAltText("Foto Achmad Hasanudin")).toHaveAttribute(
      "src",
      "http://localhost:8000/storage/image/anggota/member.jpg",
    );
  });

  it("shows an accessible fallback when the photo is missing", () => {
    render(<PhysicalKtaCard card={{ ...card, foto: null }} />);

    expect(screen.getByLabelText("Foto anggota tidak tersedia")).toHaveTextContent("A");
  });
});
