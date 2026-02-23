import { getAllProofs } from "@/lib/actions/proofs";
import { AllProofsClient } from "./client";

export default async function AllProofsPage() {
    const { data: proofs } = await getAllProofs();

    return <AllProofsClient proofs={proofs} />;
}
