
'use client';

// Import React hooks.
// useState stores data that the component needs.
// useEffect runs code after the component renders.
import { useEffect, useState } from 'react';

// Import chart components from Recharts.
// These components help display data visually using bar charts and pie charts.
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// Import the Supabase client used to communicate with the database.
import { supabase } from '../lib/supabase';

// Define an array of colors for the pie chart.
// Each category will receive a different color.
const C = ['#2563eb', '#f59e0b', '#16a34a', '#a855f7', '#ef4444'];

// Define the Analytics component.
// This component retrieves spending information and displays it in charts and a table.
export default function Analytics() {

  // Create three state variables to store data retrieved from Supabase.
  // m = Monthly spending data.
  // a = Spending data grouped by appliance.
  // c = Spending data grouped by category.
  //
  // useState([]) initializes each variable as an empty array.
  // setM, setA, and setC update the corresponding state variables.
  const [m, setM] = useState([]),
        [a, setA] = useState([]),
        [c, setC] = useState([]);

  // useEffect runs after the component first renders.
  // It retrieves the analytics data from three database views.
  useEffect(() => {

    // An asynchronous function allows us to wait for database responses.
    // async/await makes the database requests easier to read.
    (async () => {

      // Retrieve monthly spending records from the v_monthly_costs view.
      // order('month') arranges the records by month.
      // setM stores the retrieved records in the monthly spending state.
      // If no data is returned, an empty array is used instead.
      setM(
        (await supabase
          .from('v_monthly_costs')
          .select('*')
          .order('month')).data || []
      );

      // Retrieve spending information grouped by appliance.
      // The results are stored in the appliance state variable.
      setA(
        (await supabase
          .from('v_cost_by_appliance')
          .select('*')).data || []
      );

      // Retrieve spending information grouped by category.
      // The results are stored in the category state variable.
      setC(
        (await supabase
          .from('v_cost_by_category')
          .select('*')).data || []
      );

    })();

  // An empty dependency array means this effect runs only once
  // when the component initially mounts.
  }, []);

  // Calculate total spending across all months.
  // reduce() adds the total from each monthly record.
  // The + operator converts each total into a number.
  const total = m.reduce((s, x) => s + +x.total, 0);

  // Return the analytics dashboard interface.
  return (<>

    {/* CARD 1: DISPLAY TOTAL SPENDING */}
    <div className="card">
      <h3>Total spending</h3>

      {/* toFixed(2) formats the total to two decimal places. */}
      <h1>${total.toFixed(2)}</h1>
    </div>


    {/* CARD 2: DISPLAY MONTHLY SPENDING */}
    <div className="card">
      <h3>Monthly spending</h3>

      {/* ResponsiveContainer makes the chart adjust to its container width. */}
      <ResponsiveContainer height={220}>

        {/* BarChart displays spending information as vertical bars. */}
        <BarChart
          data={m.map(x => ({
            ...x,

            // Convert total spending from a string to a number.
            total: +x.total,

            // Extract the year and month from the date.
            // Example: 2026-05-15 becomes 2026-05.
            month: x.month.slice(0, 7)
          }))}
        >

          {/* XAxis displays the months along the horizontal axis. */}
          <XAxis dataKey="month" />

          {/* YAxis displays the spending amounts along the vertical axis. */}
          <YAxis />

          {/* Tooltip displays additional information when hovering over a bar. */}
          <Tooltip />

          {/* Bar represents the monthly spending values.
              dataKey="total" tells the chart which field to display.
              fill sets the color of the bars. */}
          <Bar dataKey="total" fill="#2563eb" />

        </BarChart>
      </ResponsiveContainer>
    </div>


    {/* CARD 3: DISPLAY SPENDING BY CATEGORY */}
    <div className="card">
      <h3>By category</h3>

      {/* ResponsiveContainer adjusts the pie chart to its available width. */}
      <ResponsiveContainer height={220}>

        {/* PieChart displays spending distribution using a circular chart. */}
        <PieChart>

          {/* Pie defines the actual pie chart.
              Each database record becomes a slice of the pie. */}
          <Pie
            data={c.map(x => ({
              // Use the category name as the label.
              name: x.category,

              // Convert the total spending into a number.
              value: +x.total
            }))}

            // Tells the chart which field contains the slice values.
            dataKey="value"

            // Tells the chart which field contains category names.
            nameKey="name"

            // Controls the outer size of the pie chart.
            outerRadius={80}
          >

            {/* Assign a color to each pie slice.
                i represents the current item's position in the array.
                The modulo operator (%) cycles through the five colors
                if there are more than five categories. */}
            {c.map((_, i) => (
              <Cell key={i} fill={C[i % 5]} />
            ))}

          </Pie>

          {/* Legend displays the names of the categories. */}
          <Legend />

          {/* Tooltip displays category details when hovering over a slice. */}
          <Tooltip />

        </PieChart>
      </ResponsiveContainer>
    </div>


    {/* CARD 4: DISPLAY COST PER APPLIANCE */}
    <div className="card">
      <h3>Cost per appliance</h3>

      {/* Create a table with four columns. */}
      <table>

        {/* Table heading section. */}
        <thead>
          <tr>
            <th>Appliance</th>
            <th>Spent</th>
            <th>Replacement cost</th>
            <th></th>
          </tr>
        </thead>

        {/* Table body contains the appliance records retrieved from Supabase. */}
        <tbody>

          {/* map() loops through every appliance record.
              Each record is displayed as a separate table row. */}
          {a.map(x => (

            // appliance_id provides a unique key for each table row.
            <tr key={x.appliance_id}>

              {/* Display the appliance name. */}
              <td>{x.name}</td>

              {/* Display the total amount spent on the appliance.
                  Convert the value to a number and format it to two decimals. */}
              <td>${(+x.total).toFixed(2)}</td>

              {/* Display replacement cost if available.
                  Otherwise, display an em dash (—). */}
              <td>
                {x.replacement_cost
                  ? '$' + x.replacement_cost
                  : '—'}
              </td>

              {/* Check whether repair spending has reached at least
                  50% of the appliance's replacement cost.

                  If both conditions are true, display a warning.
                  The warning helps identify appliances that may be
                  more economical to replace than continue repairing. */}
              <td>
                {x.replacement_cost &&
                  x.total >= 0.5 * x.replacement_cost &&
                  <span className="pill bad">
                    ⚠ Costs more to repair than replace
                  </span>}
              </td>

            </tr>
          ))}

        </tbody>
      </table>
    </div>

  </>);
}
