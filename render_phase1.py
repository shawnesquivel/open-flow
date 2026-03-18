from paraview.simple import *


CASE_FILE = "/root/pitzDaily-results/case.OpenFOAM"
OUT_DIR = "/root/pitzDaily-viz"
TIME_VALUE = 0.3


def set_common_view(view):
    view.ViewSize = [1800, 600]
    view.OrientationAxesVisibility = 0
    view.CameraParallelProjection = 1
    view.Background = [1.0, 1.0, 1.0]


def prepare_reader():
    reader = OpenFOAMReader(FileName=CASE_FILE)
    reader.MeshRegions = ["internalMesh"]
    reader.CellArrays = ["U", "p"]

    UpdatePipeline(time=TIME_VALUE, proxy=reader)
    cell_to_point = CellDatatoPointData(registrationName="CellToPoint", Input=reader)
    UpdatePipeline(time=TIME_VALUE, proxy=cell_to_point)
    return reader, cell_to_point


def make_midplane_slice(source):
    plane = Slice(registrationName="MidPlane", Input=source)
    plane.SliceType = "Plane"
    plane.SliceType.Origin = [0.1347, 0.0, 0.0]
    plane.SliceType.Normal = [0.0, 0.0, 1.0]
    UpdatePipeline(time=TIME_VALUE, proxy=plane)
    return plane


def save_velocity(slice_source):
    view = CreateView("RenderView")
    set_common_view(view)
    display = Show(slice_source, view)
    display.Representation = "Surface"
    ColorBy(display, ("POINTS", "U", "Magnitude"))
    display.RescaleTransferFunctionToDataRange(True, False)
    GetColorTransferFunction("U").ApplyPreset("Blue to Red Rainbow", True)
    view.ResetCamera()
    SaveScreenshot(f"{OUT_DIR}/velocity_magnitude.png", view)
    Delete(view)


def save_pressure(slice_source):
    view = CreateView("RenderView")
    set_common_view(view)
    display = Show(slice_source, view)
    display.Representation = "Surface"
    ColorBy(display, ("POINTS", "p"))
    display.RescaleTransferFunctionToDataRange(True, False)
    GetColorTransferFunction("p").ApplyPreset("Cool to Warm", True)
    view.ResetCamera()
    SaveScreenshot(f"{OUT_DIR}/pressure_contours.png", view)
    Delete(view)


def save_streamlines(source):
    view = CreateView("RenderView")
    set_common_view(view)

    stream_tracer = StreamTracer(registrationName="StreamTracer", Input=source, SeedType="Line")
    stream_tracer.Vectors = ["POINTS", "U"]
    stream_tracer.MaximumStreamlineLength = 0.5
    stream_tracer.IntegrationDirection = "FORWARD"
    stream_tracer.SeedType.Point1 = [-0.0206, -0.025, 0.0]
    stream_tracer.SeedType.Point2 = [-0.0206, 0.025, 0.0]
    stream_tracer.SeedType.Resolution = 30
    UpdatePipeline(time=TIME_VALUE, proxy=stream_tracer)

    tubes = Tube(registrationName="StreamTubes", Input=stream_tracer)
    tubes.Radius = 0.00045
    UpdatePipeline(time=TIME_VALUE, proxy=tubes)

    outline = Slice(registrationName="StreamlineMidPlane", Input=source)
    outline.SliceType = "Plane"
    outline.SliceType.Origin = [0.1347, 0.0, 0.0]
    outline.SliceType.Normal = [0.0, 0.0, 1.0]
    UpdatePipeline(time=TIME_VALUE, proxy=outline)

    outline_display = Show(outline, view)
    outline_display.Representation = "Surface"
    ColorBy(outline_display, None)
    outline_display.Opacity = 0.18
    outline_display.DiffuseColor = [0.7, 0.7, 0.7]

    tube_display = Show(tubes, view)
    tube_display.Representation = "Surface"
    ColorBy(tube_display, ("POINTS", "U", "Magnitude"))
    tube_display.RescaleTransferFunctionToDataRange(True, False)
    GetColorTransferFunction("U").ApplyPreset("Blue to Red Rainbow", True)

    view.ResetCamera()
    SaveScreenshot(f"{OUT_DIR}/streamlines.png", view)
    Delete(view)


def save_line_samples(source):
    velocity_line = PlotOverLine(registrationName="VelocityProfileLine", Input=source)
    velocity_line.Point1 = [0.01, -0.025, 0.0]
    velocity_line.Point2 = [0.01, 0.025, 0.0]
    velocity_line.Resolution = 200
    UpdatePipeline(time=TIME_VALUE, proxy=velocity_line)
    SaveData(f"{OUT_DIR}/velocity_profile_x001.csv", proxy=velocity_line)

    pressure_line = PlotOverLine(registrationName="CenterlinePressureLine", Input=source)
    pressure_line.Point1 = [-0.0206, 0.0, 0.0]
    pressure_line.Point2 = [0.29, 0.0, 0.0]
    pressure_line.Resolution = 300
    UpdatePipeline(time=TIME_VALUE, proxy=pressure_line)
    SaveData(f"{OUT_DIR}/centerline_pressure.csv", proxy=pressure_line)


def main():
    reader, cell_to_point = prepare_reader()
    slice_source = make_midplane_slice(cell_to_point)
    save_velocity(slice_source)
    save_pressure(slice_source)
    save_streamlines(cell_to_point)
    save_line_samples(cell_to_point)
    Delete(slice_source)
    Delete(cell_to_point)
    Delete(reader)


main()
