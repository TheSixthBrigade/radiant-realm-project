export default function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="p-8 flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-[#333] rounded-full flex items-center justify-center mb-6">
                <div className="w-8 h-8 border-2 border-[#3ecf8e] border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            <p className="text-gray-400 max-w-md">
                This module is currently being provisioned by the Orchestrator.
                Please check back in a few moments.
            </p>
        </div>
    )
}
