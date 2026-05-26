import { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ProjectEditModal({ isOpen, onClose, project, workspace }) {
    if (!isOpen || !project) return null;

    const { data, setData, patch, processing, errors, reset } = useForm({
        name: project.name,
    });

    useEffect(() => {
        setData("name", project.name);
    }, [project]);

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(`/workspaces/${workspace.slug}/projects/${project.slug}`, {
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface2 border border-border p-8 rounded-3xl w-full max-w-sm space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                        Rename Project
                    </h3>
                    <p className="text-xs text-muted">
                        Update the project display name.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="PROJECT NAME"
                        placeholder="E.g. Mobile App"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        error={errors.name}
                        autoFocus
                    />
                    <div className="flex items-center gap-3">
                        <Button
                            loading={processing}
                            className="flex-1"
                        >
                            Save
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                reset();
                                onClose();
                            }}
                            className="bg-surface hover:bg-surface2 border-border"
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
