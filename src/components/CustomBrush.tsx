import React from "react";
import { Brush } from "recharts";

export const CustomBrush: React.FC<any> = (props) => {
  return (
    <Brush
      {...props}
      tickFormatter={() => ""} // hide default labels
      alwaysShowText={true}
    />
  );
};