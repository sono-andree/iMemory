export default function SidebarLogo() {
  return (
    <div className="flex flex-col items-center mb-8">

      <img
        src="/new-icon-main.png"
        alt="iMemory"
        className="
          w-[300px]
          h-30
          object-contain
          drop-shadow-[0_0_35px_rgba(168,85,247,0.9)]
          hover:scale-105
          transition-all
          duration-500
        "
      />


    </div>
  );
}