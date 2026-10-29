interface StatsViewProps {
   percent: number;
   items: { label: string; value: number }[];
}

function StatsView({ percent, items }: StatsViewProps) {
   return (
      <div className="space-y-6">
         <div className="space-y-2">
            <div className="flex justify-between text-sm">
               <span className="font-medium">Transcription progress</span>
               <span className="tabular-nums">{percent}%</span>
            </div>
            <div
               role="progressbar"
               aria-valuenow={percent}
               aria-valuemin={0}
               aria-valuemax={100}
               className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
               <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${percent}%` }}
               />
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map(({ label, value }) => (
               <div key={label} className="rounded-lg border p-4">
                  <div className="text-2xl font-semibold tabular-nums">
                     {value}
                  </div>
                  <div className="text-sm text-muted-foreground">{label}</div>
               </div>
            ))}
         </div>
      </div>
   );
}

export default StatsView;
