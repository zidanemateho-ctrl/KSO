import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatSemester } from "../../utils/format";

interface Point {
  semester: string;
  average: number;
}

export function ProgressChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full min-h-64 min-w-fit">
      <ResponsiveContainer width="100%" height="100%" minWidth={200}>
        <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#d2dff5" />
          <XAxis dataKey="semester" tickFormatter={(value) => formatSemester(value)} stroke="#4d6e99" fontSize={12} />
          <YAxis domain={[0, 20]} stroke="#4d6e99" fontSize={12} />
          <Tooltip
            contentStyle={{ borderRadius: "12px", borderColor: "#c3d6f1" }}
            formatter={(value) => [`${Number(value ?? 0).toFixed(2)}/20`, "Moyenne"]}
            labelFormatter={(label) => formatSemester(label)}
          />
          <Line type="monotone" dataKey="average" stroke="#12396a" strokeWidth={3} dot={{ r: 5, fill: "#0db6d9", stroke: "#12396a" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
